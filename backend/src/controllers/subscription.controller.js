import mongoose from "mongoose"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { Subscription } from "../models/subscription.model.js"
import { User } from "../models/user.model.js"

const parseSort = (sortBy, sortOrder, allowedSortFields, fallback) => {
    const field = allowedSortFields.includes(sortBy) ? sortBy : fallback
    const dir = String(sortOrder).toLowerCase() === "asc" ? 1 : -1
    return { [field]: dir }
}

const subscribeChannel = asyncHandler(async (req, res) => {
    const { id } = req.params // channel id
    if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid channel id")

    const channel = await User.findById(id).select("_id")
    if (!channel) throw new ApiError(404, "Channel not found")

    if (req.user?._id?.toString() === id) throw new ApiError(400, "You cannot subscribe to yourself")

    await Subscription.updateOne(
        { subscriber: req.user?._id, channel: id },
        { $setOnInsert: { subscriber: req.user?._id, channel: id } },
        { upsert: true }
    )

    const subscribersCount = await Subscription.countDocuments({ channel: id })
    return res
        .status(200)
        .json(new ApiResponse(200, { subscribed: true, subscribersCount }, "Subscribed"))
})

const unsubscribeChannel = asyncHandler(async (req, res) => {
    const { id } = req.params // channel id
    if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid channel id")

    await Subscription.deleteOne({ subscriber: req.user?._id, channel: id })

    const subscribersCount = await Subscription.countDocuments({ channel: id })
    return res
        .status(200)
        .json(new ApiResponse(200, { subscribed: false, subscribersCount }, "Unsubscribed"))
})

const listChannelSubscribers = asyncHandler(async (req, res) => {
    const { id } = req.params // channel id
    if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid channel id")

    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10))
    const sort = parseSort(req.query.sortBy, req.query.sortOrder, ["createdAt"], "createdAt")

    const pipeline = [
        { $match: { channel: new mongoose.Types.ObjectId(id) } },
        { $sort: sort },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber"
            }
        },
        { $unwind: { path: "$subscriber", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                channel: 1,
                createdAt: 1,
                subscriber: {
                    _id: 1,
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                    role: 1
                }
            }
        }
    ]

    const aggregate = Subscription.aggregate(pipeline)
    const result = await Subscription.aggregatePaginate(aggregate, { page, limit })
    return res.status(200).json(new ApiResponse(200, result, "Subscribers fetched"))
})

const listMySubscriptions = asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10))
    const sort = parseSort(req.query.sortBy, req.query.sortOrder, ["createdAt"], "createdAt")

    const pipeline = [
        { $match: { subscriber: new mongoose.Types.ObjectId(req.user?._id) } },
        { $sort: sort },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel"
            }
        },
        { $unwind: { path: "$channel", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                subscriber: 1,
                createdAt: 1,
                channel: {
                    _id: 1,
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                    role: 1
                }
            }
        }
    ]

    const aggregate = Subscription.aggregate(pipeline)
    const result = await Subscription.aggregatePaginate(aggregate, { page, limit })
    return res.status(200).json(new ApiResponse(200, result, "My subscriptions fetched"))
})

export { subscribeChannel, unsubscribeChannel, listChannelSubscribers, listMySubscriptions }

