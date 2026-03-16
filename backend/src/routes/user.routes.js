import { Router } from "express";
import { refreshAccessToken, loggedOutUser, loginUser, registerUser } from "../controllers/user.controller.js";

import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/roles.middleware.js";
import { listMySubscriptions } from "../controllers/subscription.controller.js";

const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        }, 
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
    )

router.route("/login").post(loginUser)

//secured routes
router.route("/logout").post(verifyJWT, loggedOutUser)
router.route("/refresh-token").post(refreshAccessToken)

router.route("/me/subscriptions").get(verifyJWT, listMySubscriptions)

// role-protected demo routes (use these patterns for uploads/admin actions)
router
    .route("/creator/ping")
    .get(verifyJWT, authorizeRoles("creator", "admin"), (req, res) => {
        return res.status(200).json({
            ok: true,
            role: req.user?.role,
            message: "Creator/Admin access granted"
        })
    })

router.route("/admin/ping").get(verifyJWT, authorizeRoles("admin"), (req, res) => {
    return res.status(200).json({
        ok: true,
        role: req.user?.role,
        message: "Admin access granted"
    })
})

export default router