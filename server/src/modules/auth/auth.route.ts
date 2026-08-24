import { Router } from "express";

import {
    login,
    refreshAccessToken,
    register,
    logout,
} from "./auth.controller.js";

import {
    loginSchema,
    registerSchema,
} from "./auth.validation.js";

import { validateRequest } from "../../middleware/validateRequest.js";
import { authenticate } from "../../middleware/auth.middleware.js";

const authRouter = Router();

authRouter.post(
    "/register",
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

authRouter.get("/me", authenticate, (_req, res) => {
    return res.status(200).json({
        success: true,
        message: "Authenticated user",
        data: res.locals.user,
    });
});



export default authRouter;