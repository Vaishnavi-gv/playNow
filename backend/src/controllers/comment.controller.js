import mongoose from "mongoose"
import { Comment } from "../models/comment.model.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const deleteComment = asyncHandler(async (req, res) => {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid comment id")

    const comment = await Comment.findById(id).select("user")
    if (!comment) throw new ApiError(404, "Comment not found")

    const isOwner = comment.user?.toString() === req.user?._id?.toString()
    const isAdmin = req.user?.role === "admin"
    if (!isOwner && !isAdmin) throw new ApiError(403, "Forbidden")

    await Comment.deleteOne({ _id: id })
    return res.status(200).json(new ApiResponse(200, {}, "Comment deleted"))
})

export { deleteComment }

