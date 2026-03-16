import mongoose from "mongoose"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { Subscription } from "../models/subscription.model.js"
import { User } from "../models/user.model.js"

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
    const skip = (page - 1) * limit

    const [docs, total] = await Promise.all([
        Subscription.find({ channel: id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("subscriber", "username fullName avatar role"),
        Subscription.countDocuments({ channel: id })
    ])

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                docs,
                totalDocs: total,
                limit,
                page,
                totalPages: Math.ceil(total / limit) || 1
            },
            "Subscribers fetched"
        )
    )
})

const listMySubscriptions = asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10))
    const skip = (page - 1) * limit

    const [docs, total] = await Promise.all([
        Subscription.find({ subscriber: req.user?._id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("channel", "username fullName avatar role"),
        Subscription.countDocuments({ subscriber: req.user?._id })
    ])

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                docs,
                totalDocs: total,
                limit,
                page,
                totalPages: Math.ceil(total / limit) || 1
            },
            "My subscriptions fetched"
        )
    )
})

export { subscribeChannel, unsubscribeChannel, listChannelSubscribers, listMySubscriptions }

