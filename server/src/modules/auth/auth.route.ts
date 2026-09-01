import { Router } from "express";

import {
    login,
    refreshAccessToken,
    register,
    logout,
    getCurrentUser,
} from "./auth.controller.js";

import {
    loginSchema,
    registerSchema,
} from "./auth.validation.js";

import { validateRequest } from "../../middleware/validateRequest.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/authorizeRoles.js";

const authRouter = Router();

authRouter.post(
    "/register",
    authenticate,
    authorizeRoles("ADMIN"),
    validateRequest(registerSchema),
    register
);

authRouter.post(
    "/login",
    validateRequest(loginSchema),
    login
);

authRouter.post("/refresh", refreshAccessToken);

authRouter.post("/logout", logout);

authRouter.get("/me", authenticate, getCurrentUser);

authRouter.get(
    "/admin-test",
    authenticate,
    authorizeRoles("ADMIN"),
    (_req, res) => {
        return res.status(200).json({
            success: true,
            message: "Admin access granted",
        });
    }
);

export default authRouter;