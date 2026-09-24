import {
    Router,
} from "express";

import {
    changePassword,
    getCurrentUser,
    login,
    logout,
    refreshAccessToken,
    register,
} from "./auth.controller.js";

import {
    changePasswordSchema,
    loginSchema,
    registerSchema,
} from "./auth.validation.js";

import {
    validateRequest,
} from "../../middleware/validateRequest.js";

import {
    authenticate,
} from "../../middleware/auth.middleware.js";

import {
    authorizeRoles,
} from "../../middleware/authorizeRoles.js";

import {
    authLimiter,
} from "../../middleware/security.middleware.js";

const authRouter =
    Router();

/*
 * Admin creates user.
 */
authRouter.post(
    "/register",
    authenticate,
    authorizeRoles("ADMIN"),
    authLimiter,
    validateRequest(
        registerSchema
    ),
    register
);

/*
 * Login.
 */
authRouter.post(
    "/login",
    authLimiter,
    validateRequest(
        loginSchema
    ),
    login
);

/*
 * Change password.
 *
 * User must already be authenticated.
 */
authRouter.post(
    "/change-password",
    authenticate,
    validateRequest(
        changePasswordSchema
    ),
    changePassword
);

/*
 * Refresh access token.
 */
authRouter.post(
    "/refresh",
    refreshAccessToken
);

/*
 * Logout.
 */
authRouter.post(
    "/logout",
    logout
);

/*
 * Current authenticated user.
 */
authRouter.get(
    "/me",
    authenticate,
    getCurrentUser
);

/*
 * Admin test route.
 */
authRouter.get(
    "/admin-test",
    authenticate,
    authorizeRoles("ADMIN"),
    (_req, res) => {
        return res
            .status(200)
            .json({
                success: true,

                message:
                    "Admin access granted",
            });
    }
);

export default authRouter;