import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { deleteComment } from "../controllers/comment.controller.js"

const router = Router()

router.route("/:id").delete(verifyJWT, deleteComment)

export default router

