import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { Video } from "../models/video.model.js"
import mongoose from "mongoose"

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

    const pipeline = [
        // return all videos; use isPublished later if you add drafts
        { $sort: { createdAt: -1 } }
    ]

    const aggregate = Video.aggregate(pipeline)
    const result = await Video.aggregatePaginate(aggregate, { page, limit })

    return res.status(200).json(new ApiResponse(200, result, "Videos fetched"))
})

export { uploadVideo, getVideoById, listVideos }

