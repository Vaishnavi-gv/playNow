import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { authorizeRoles } from "../middlewares/roles.middleware.js"
import { upload } from "../middlewares/multer.middleware.js"
import {
    addComment,
    getLikesCount,
    getVideoById,
    listComments,
    listVideos,
    searchVideos,
    toggleLike,
    uploadVideo
} from "../controllers/video.controller.js"

const router = Router()

// public
router.route("/search").get(searchVideos)
router.route("/").get(listVideos)
router.route("/:id").get(getVideoById)
router.route("/:id/likes/count").get(getLikesCount)
router.route("/:id/comments").get(listComments)

// creator-only upload
router.route("/").post(
    verifyJWT,
    authorizeRoles("creator", "admin"),
    upload.fields([
        { name: "videoFile", maxCount: 1 },
        { name: "thumbnail", maxCount: 1 }
    ]),
    uploadVideo
)

// auth-required actions
router.route("/:id/like").post(verifyJWT, toggleLike)
router.route("/:id/comments").post(verifyJWT, addComment)

export default router

