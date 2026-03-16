import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { Video } from "../models/video.model.js"
import mongoose from "mongoose"
import { Like } from "../models/like.model.js"
import { Comment } from "../models/comment.model.js"

const parseSort = (sortBy, sortOrder, allowedSortFields, fallback) => {
    const field = allowedSortFields.includes(sortBy) ? sortBy : fallback
    const dir = String(sortOrder).toLowerCase() === "asc" ? 1 : -1
    return { [field]: dir }
}

const uploadVideo = asyncHandler(async (req, res) => {
    const { title, description, duration, isPublished } = req.body

    if ([title, description, duration].some((field) => field?.toString().trim() === "")) {
        throw new ApiError(400, "title, description and duration are required")
    }

    const videoLocalPath = req.files?.videoFile?.[0]?.path
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path

    if (!videoLocalPath) throw new ApiError(400, "videoFile is required")
    if (!thumbnailLocalPath) throw new ApiError(400, "thumbnail is required")

    const uploadedVideo = await uploadOnCloudinary(videoLocalPath)
    const uploadedThumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if (!uploadedVideo?.url) throw new ApiError(500, "Failed to upload video file")
    if (!uploadedThumbnail?.url) throw new ApiError(500, "Failed to upload thumbnail")

    const video = await Video.create({
        videoFile: uploadedVideo.url,
        thumbnail: uploadedThumbnail.url,
        title: title.trim(),
        description: description.trim(),
        duration: Number(duration),
        // Default to published unless explicitly set to false.
        isPublished:
            isPublished === undefined
                ? true
                : typeof isPublished === "boolean"
                  ? isPublished
                  : String(isPublished).toLowerCase() === "true",
        owner: req.user?._id
    })

    return res.status(201).json(new ApiResponse(201, video, "Video uploaded"))
})

const getVideoById = asyncHandler(async (req, res) => {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid video id")

    const video = await Video.findById(id).populate("owner", "username fullName avatar role")
    if (!video) throw new ApiError(404, "Video not found")

    return res.status(200).json(new ApiResponse(200, video, "Video fetched"))
})

const listVideos = asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10))
    const sort = parseSort(req.query.sortBy, req.query.sortOrder, ["createdAt", "views", "duration", "title"], "createdAt")

    const pipeline = [
        { $sort: sort }
    ]

    const aggregate = Video.aggregate(pipeline)
    const result = await Video.aggregatePaginate(aggregate, { page, limit })

    return res.status(200).json(new ApiResponse(200, result, "Videos fetched"))
})

const searchVideos = asyncHandler(async (req, res) => {
    const q = String(req.query.q || "").trim()
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10))
    const sort = parseSort(req.query.sortBy, req.query.sortOrder, ["createdAt", "views", "duration", "title", "score"], "createdAt")

    if (!q) throw new ApiError(400, "q is required")

    const pipeline = [
        { $match: { $text: { $search: q } } },
        { $addFields: { score: { $meta: "textScore" } } },
        { $sort: req.query.sortBy === "score" ? { score: -1 } : sort }
    ]

    const aggregate = Video.aggregate(pipeline)
    const result = await Video.aggregatePaginate(aggregate, { page, limit })

    return res.status(200).json(new ApiResponse(200, result, "Search results fetched"))
})

const toggleLike = asyncHandler(async (req, res) => {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid video id")

    const video = await Video.findById(id).select("_id")
    if (!video) throw new ApiError(404, "Video not found")

    const userId = req.user?._id

    const existing = await Like.findOne({ user: userId, video: id }).select("_id")
    let liked
    if (existing) {
        await Like.deleteOne({ _id: existing._id })
        liked = false
    } else {
        await Like.create({ user: userId, video: id })
        liked = true
    }

    const likesCount = await Like.countDocuments({ video: id })
    return res.status(200).json(new ApiResponse(200, { liked, likesCount }, "Like updated"))
})

const getLikesCount = asyncHandler(async (req, res) => {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid video id")

    const likesCount = await Like.countDocuments({ video: id })
    return res.status(200).json(new ApiResponse(200, { likesCount }, "Likes count fetched"))
})

const addComment = asyncHandler(async (req, res) => {
    const { id } = req.params
    const { content } = req.body

    if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid video id")
    if (!content || content.trim() === "") throw new ApiError(400, "content is required")

    const video = await Video.findById(id).select("_id")
    if (!video) throw new ApiError(404, "Video not found")

    const comment = await Comment.create({
        user: req.user?._id,
        video: id,
        content: content.trim()
    })

    const populated = await Comment.findById(comment._id).populate("user", "username fullName avatar role")
    return res.status(201).json(new ApiResponse(201, populated, "Comment added"))
})

const listComments = asyncHandler(async (req, res) => {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid video id")

    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10))
    const sort = parseSort(req.query.sortBy, req.query.sortOrder, ["createdAt"], "createdAt")

    const pipeline = [
        { $match: { video: new mongoose.Types.ObjectId(id) } },
        { $sort: sort },
        {
            $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "user"
            }
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                content: 1,
                video: 1,
                createdAt: 1,
                updatedAt: 1,
                user: {
                    _id: 1,
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                    role: 1
                }
            }
        }
    ]

    const aggregate = Comment.aggregate(pipeline)
    const result = await Comment.aggregatePaginate(aggregate, { page, limit })

    return res.status(200).json(new ApiResponse(200, result, "Comments fetched"))
})

export {
    uploadVideo,
    getVideoById,
    listVideos,
    searchVideos,
    toggleLike,
    getLikesCount,
    addComment,
    listComments
}

