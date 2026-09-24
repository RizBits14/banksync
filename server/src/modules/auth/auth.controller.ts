import type {
    Request,
    Response,
} from "express";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";

import {
    AuthSession,
} from "./auth.session.model.js";

import {
    generateAccessToken,
    generateRefreshToken,
} from "./auth.token.js";

import {
    User,
    type UserRole,
} from "../users/user.model.js";

import {
    createBusinessAudit,
} from "../audit/audit.service.js";

/*
 * ----------------------------------------
 * REGISTER USER
 * ----------------------------------------
 */
export const register = async (
    req: Request,
    res: Response
) => {
    try {
        const {
            name,
            email,
            password,
            role,
        } = req.body;

        const currentUser =
            res.locals.user;

        const normalizedEmail =
            String(email)
                .trim()
                .toLowerCase();

        const existingUser =
            await User.findOne({
                email:
                    normalizedEmail,
            });

        if (existingUser) {
            return res
                .status(409)
                .json({
                    success: false,

                    message:
                        "User already exists",
                });
        }

        const hashedPassword =
            await bcrypt.hash(
                password,
                12
            );

        /*
         * Manually created users also receive
         * a temporary password, so they must
         * change it on first login.
         */
        const user =
            await User.create({
                name,

                email:
                    normalizedEmail,

                password:
                    hashedPassword,

                role,

                isActive:
                    true,

                mustChangePassword:
                    true,
            });

        await createBusinessAudit({
            actorId:
                currentUser?.userId,

            actorRole:
                currentUser?.role,

            entityType:
                "USER",

            entityId:
                user._id.toString(),

            action:
                "USER_CREATED",

            description:
                "New BankSync user account was created",

            metadata: {
                name:
                    user.name,

                email:
                    user.email,

                role:
                    user.role,

                isActive:
                    user.isActive,

                mustChangePassword:
                    user.mustChangePassword,
            },
        });

        return res
            .status(201)
            .json({
                success: true,

                message:
                    "User registered successfully",

                data: {
                    id:
                        user._id,

                    name:
                        user.name,

                    email:
                        user.email,

                    role:
                        user.role,

                    isActive:
                        user.isActive,

                    mustChangePassword:
                        user.mustChangePassword,
                },
            });
    } catch (error) {
        console.error(
            "Register user error:",
            error
        );

        return res
            .status(500)
            .json({
                success: false,

                message:
                    "Unable to register user",
            });
    }
};

/*
 * ----------------------------------------
 * LOGIN
 * ----------------------------------------
 */
export const login = async (
    req: Request,
    res: Response
) => {
    try {
        const {
            email,
            password,
        } = req.body;

        const normalizedEmail =
            String(email)
                .trim()
                .toLowerCase();

        const user =
            await User.findOne({
                email:
                    normalizedEmail,
            });

        if (
            !user ||
            !user.isActive
        ) {
            return res
                .status(401)
                .json({
                    success: false,

                    message:
                        "Invalid email or password",
                });
        }

        const passwordMatches =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!passwordMatches) {
            return res
                .status(401)
                .json({
                    success: false,

                    message:
                        "Invalid email or password",
                });
        }

        const payload = {
            userId:
                user._id.toString(),

            role:
                user.role,
        };

        const accessToken =
            generateAccessToken(
                payload
            );

        const refreshToken =
            generateRefreshToken(
                payload
            );

        const refreshTokenHash =
            crypto
                .createHash(
                    "sha256"
                )
                .update(
                    refreshToken
                )
                .digest("hex");

        await AuthSession.create({
            userId:
                user._id,

            tokenHash:
                refreshTokenHash,

            expiresAt:
                new Date(
                    Date.now() +
                        7 *
                            24 *
                            60 *
                            60 *
                            1000
                ),
        });

        const isProduction =
            process.env.NODE_ENV ===
            "production";

        res.cookie(
            "accessToken",
            accessToken,
            {
                httpOnly: true,

                secure:
                    isProduction,

                sameSite:
                    isProduction
                        ? "none"
                        : "lax",

                maxAge:
                    15 *
                    60 *
                    1000,
            }
        );

        res.cookie(
            "refreshToken",
            refreshToken,
            {
                httpOnly: true,

                secure:
                    isProduction,

                sameSite:
                    isProduction
                        ? "none"
                        : "lax",

                maxAge:
                    7 *
                    24 *
                    60 *
                    60 *
                    1000,
            }
        );

        return res
            .status(200)
            .json({
                success: true,

                message:
                    "Login successful",

                data: {
                    id:
                        user._id,

                    name:
                        user.name,

                    email:
                        user.email,

                    role:
                        user.role,

                    mustChangePassword:
                        user.mustChangePassword,
                },
            });
    } catch (error) {
        console.error(
            "Login error:",
            error
        );

        return res
            .status(500)
            .json({
                success: false,

                message:
                    "Unable to login",
            });
    }
};

/*
 * ----------------------------------------
 * CURRENT USER
 * ----------------------------------------
 */
export const getCurrentUser =
    async (
        _req: Request,
        res: Response
    ) => {
        try {
            const userId =
                res.locals.user
                    .userId;

            const user =
                await User.findById(
                    userId
                ).select(
                    "-password -__v"
                );

            if (
                !user ||
                !user.isActive
            ) {
                return res
                    .status(401)
                    .json({
                        success: false,

                        message:
                            "User is unavailable",
                    });
            }

            return res
                .status(200)
                .json({
                    success: true,

                    message:
                        "Authenticated user",

                    data:
                        user,
                });
        } catch (error) {
            console.error(
                "Get current user error:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,

                    message:
                        "Unable to retrieve current user",
                });
        }
    };

/*
 * ----------------------------------------
 * CHANGE PASSWORD
 * ----------------------------------------
 *
 * Used for:
 * - mandatory first-login password change
 * - future normal password changes
 */
export const changePassword =
    async (
        req: Request,
        res: Response
    ) => {
        try {
            const userId =
                res.locals.user
                    .userId;

            const {
                currentPassword,
                newPassword,
            } = req.body;

            const user =
                await User.findById(
                    userId
                );

            if (
                !user ||
                !user.isActive
            ) {
                return res
                    .status(401)
                    .json({
                        success: false,

                        message:
                            "User is unavailable",
                    });
            }

            const currentPasswordMatches =
                await bcrypt.compare(
                    currentPassword,
                    user.password
                );

            if (
                !currentPasswordMatches
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,

                        message:
                            "Current password is incorrect",
                    });
            }

            const samePassword =
                await bcrypt.compare(
                    newPassword,
                    user.password
                );

            if (samePassword) {
                return res
                    .status(400)
                    .json({
                        success: false,

                        message:
                            "New password must be different from the current password",
                    });
            }

            const hashedPassword =
                await bcrypt.hash(
                    newPassword,
                    12
                );

            const wasFirstLogin =
                user.mustChangePassword;

            user.password =
                hashedPassword;

            user.mustChangePassword =
                false;

            await user.save();

            await createBusinessAudit({
                actorId:
                    user._id.toString(),

                actorRole:
                    user.role,

                entityType:
                    "USER",

                entityId:
                    user._id.toString(),

                action:
                    wasFirstLogin
                        ? "FIRST_LOGIN_PASSWORD_CHANGED"
                        : "PASSWORD_CHANGED",

                description:
                    wasFirstLogin
                        ? "User changed temporary password after first login"
                        : "User changed account password",

                metadata: {
                    firstLogin:
                        wasFirstLogin,
                },
            });

            return res
                .status(200)
                .json({
                    success: true,

                    message:
                        wasFirstLogin
                            ? "Password changed successfully. Your BankSync account is now ready."
                            : "Password changed successfully",

                    data: {
                        mustChangePassword:
                            false,
                    },
                });
        } catch (error) {
            console.error(
                "Change password error:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,

                    message:
                        "Unable to change password",
                });
        }
    };

/*
 * ----------------------------------------
 * REFRESH ACCESS TOKEN
 * ----------------------------------------
 */
export const refreshAccessToken =
    async (
        req: Request,
        res: Response
    ) => {
        try {
            const refreshToken =
                req.cookies
                    .refreshToken;

            if (!refreshToken) {
                return res
                    .status(401)
                    .json({
                        success: false,

                        message:
                            "Refresh token required",
                    });
            }

            const secret =
                process.env
                    .REFRESH_TOKEN_SECRET;

            if (!secret) {
                throw new Error(
                    "REFRESH_TOKEN_SECRET is not defined"
                );
            }

            const decoded =
                jwt.verify(
                    refreshToken,
                    secret
                ) as {
                    userId: string;
                    role: UserRole;
                };

            const tokenHash =
                crypto
                    .createHash(
                        "sha256"
                    )
                    .update(
                        refreshToken
                    )
                    .digest("hex");

            const session =
                await AuthSession.findOne(
                    {
                        userId:
                            decoded.userId,

                        tokenHash,

                        revokedAt:
                            null,

                        expiresAt: {
                            $gt:
                                new Date(),
                        },
                    }
                );

            if (!session) {
                return res
                    .status(401)
                    .json({
                        success: false,

                        message:
                            "Refresh session is invalid",
                    });
            }

            const user =
                await User.findById(
                    decoded.userId
                );

            if (
                !user ||
                !user.isActive
            ) {
                return res
                    .status(401)
                    .json({
                        success: false,

                        message:
                            "User is unavailable",
                    });
            }

            const accessToken =
                generateAccessToken({
                    userId:
                        user._id.toString(),

                    role:
                        user.role,
                });

            const isProduction =
                process.env
                    .NODE_ENV ===
                "production";

            res.cookie(
                "accessToken",
                accessToken,
                {
                    httpOnly:
                        true,

                    secure:
                        isProduction,

                    sameSite:
                        isProduction
                            ? "none"
                            : "lax",

                    maxAge:
                        15 *
                        60 *
                        1000,
                }
            );

            return res
                .status(200)
                .json({
                    success: true,

                    message:
                        "Access token refreshed successfully",
                });
        } catch (error) {
            return res
                .status(401)
                .json({
                    success: false,

                    message:
                        "Invalid or expired refresh token",
                });
        }
    };

/*
 * ----------------------------------------
 * LOGOUT
 * ----------------------------------------
 */
export const logout = async (
    req: Request,
    res: Response
) => {
    try {
        const refreshToken =
            req.cookies
                .refreshToken;

        if (refreshToken) {
            const tokenHash =
                crypto
                    .createHash(
                        "sha256"
                    )
                    .update(
                        refreshToken
                    )
                    .digest(
                        "hex"
                    );

            await AuthSession.findOneAndUpdate(
                {
                    tokenHash,

                    revokedAt:
                        null,
                },

                {
                    revokedAt:
                        new Date(),
                }
            );
        }

        const isProduction =
            process.env
                .NODE_ENV ===
            "production";

        res.clearCookie(
            "accessToken",
            {
                httpOnly: true,

                secure:
                    isProduction,

                sameSite:
                    isProduction
                        ? "none"
                        : "lax",
            }
        );

        res.clearCookie(
            "refreshToken",
            {
                httpOnly: true,

                secure:
                    isProduction,

                sameSite:
                    isProduction
                        ? "none"
                        : "lax",
            }
        );

        return res
            .status(200)
            .json({
                success: true,

                message:
                    "Logout successful",
            });
    } catch (error) {
        console.error(
            "Logout error:",
            error
        );

        return res
            .status(500)
            .json({
                success: false,

                message:
                    "Unable to logout",
            });
    }
};