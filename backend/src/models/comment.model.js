import mongoose, { Schema } from "mongoose"
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"

const commentSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        video: {
            type: Schema.Types.ObjectId,
            ref: "Video",
            required: true,
            index: true
        },
        content: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000
        }
    },
    { timestamps: true }
)

commentSchema.index({ video: 1, createdAt: -1 })

commentSchema.plugin(mongooseAggregatePaginate)

export const Comment = mongoose.model("Comment", commentSchema)

