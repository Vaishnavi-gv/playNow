import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { authorizeRoles } from "../middlewares/roles.middleware.js"
import { upload } from "../middlewares/multer.middleware.js"
import { getVideoById, listVideos, uploadVideo } from "../controllers/video.controller.js"

const router = Router()

// public
router.route("/").get(listVideos)
router.route("/:id").get(getVideoById)

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

export default router

