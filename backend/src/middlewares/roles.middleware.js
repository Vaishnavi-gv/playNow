import { ApiError } from "../utils/ApiError.js"

export const authorizeRoles =
    (...allowedRoles) =>
    (req, _, next) => {
        const role = req.user?.role

        if (!role) {
            throw new ApiError(401, "Unauthorized request")
        }

        if (!allowedRoles.includes(role)) {
            throw new ApiError(403, "Forbidden")
        }

        return next()
    }

