import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

const app = express()

const allowedOrigins = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

app.use(
    cors({
        origin: (origin, callback) => {
            // allow non-browser clients (no Origin header)
            if (!origin) return callback(null, true)

            // when using credentials, '*' cannot be returned as Access-Control-Allow-Origin
            if (allowedOrigins.includes("*")) return callback(null, origin)

            if (allowedOrigins.includes(origin)) return callback(null, origin)

            return callback(new Error("Not allowed by CORS"))
        },
        credentials: true
    })
)

app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

//routes

import userRouter from './routes/user.routes.js'
import videoRouter from "./routes/video.routes.js"
import { ApiError } from "./utils/ApiError.js"

//routes declaration
app.use("/api/v1/users", userRouter)
app.use("/api/v1/videos", videoRouter)

// 404 handler
app.use((req, res, next) => {
    next(new ApiError(404, "Route not found"))
})

// error handler (always return JSON for API)
app.use((err, req, res, next) => {
    const statusCode = err?.statusCode || 500
    return res.status(statusCode).json({
        success: false,
        statusCode,
        message: err?.message || "Something went wrong",
        errors: err?.errors || []
    })
})


export { app }