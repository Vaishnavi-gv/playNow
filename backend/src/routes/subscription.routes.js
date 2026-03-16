import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import {
    listChannelSubscribers,
    subscribeChannel,
    unsubscribeChannel
} from "../controllers/subscription.controller.js"

const router = Router()

router.route("/:id/subscribe").post(verifyJWT, subscribeChannel)
router.route("/:id/unsubscribe").post(verifyJWT, unsubscribeChannel)
router.route("/:id/subscribers").get(listChannelSubscribers)

export default router

