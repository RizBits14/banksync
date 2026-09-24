import type {
    NextFunction,
    Request,
    Response,
} from "express";

import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import {
    User,
} from "../modules/users/user.model.js";

/*
 * These authenticated endpoints must remain
 * available while a user is still using a
 * temporary password.
 *
 * - /auth/me lets the frontend discover the
 *   mustChangePassword state.
 * - /auth/change-password is the only operation
 *   that can clear that state.
 * - /auth/logout lets the user safely leave the
 *   session without changing the password.
 */
const isFirstLoginAllowedRequest = (
    req: Request
) => {
    const path =
        req.originalUrl
            .split("?")[0]
            .replace(/\/+$/, "");

    return (
        path.endsWith(
            "/auth/me"
        ) ||
        path.endsWith(
            "/auth/change-password"
        ) ||
        path.endsWith(
            "/auth/logout"
        )
    );
};

export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const accessToken =
            req.cookies
                ?.accessToken;

        if (!accessToken) {
            return res
                .status(401)
                .json({
                    success: false,
                    message:
                        "Authentication required",
                });
        }

        const secret =
            process.env
                .ACCESS_TOKEN_SECRET;

        if (!secret) {
            throw new Error(
                "ACCESS_TOKEN_SECRET is not defined"
            );
        }

        const decoded =
            jwt.verify(
                accessToken,
                secret,
                {
                    algorithms: [
                        "HS256",
                    ],
                }
            );

        if (
            typeof decoded !==
                "object" ||
            decoded === null ||
            typeof decoded.userId !==
                "string" ||
            !mongoose
                .isObjectIdOrHexString(
                    decoded.userId
                )
        ) {
            return res
                .status(401)
                .json({
                    success: false,
                    message:
                        "Invalid or expired access token",
                });
        }

        /*
         * Always read the current database state
         * rather than trusting role/password flags
         * from the token. This means disabling a
         * user or forcing a password change takes
         * effect immediately for an existing
         * session.
         */
        const user =
            await User
                .findById(
                    decoded.userId
                )
                .select(
                    "_id role isActive mustChangePassword"
                )
                .lean();

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

        res.locals.user = {
            userId:
                user._id.toString(),

            role:
                user.role,

            mustChangePassword:
                Boolean(
                    user.mustChangePassword
                ),
        };

        /*
         * BACKEND FIRST-LOGIN SECURITY GATE
         *
         * Frontend routing is only a usability
         * control. This is the real API boundary.
         *
         * A temporary-password user cannot call
         * protected BankSync APIs directly until
         * the password has been changed.
         */
        if (
            user.mustChangePassword &&
            !isFirstLoginAllowedRequest(
                req
            )
        ) {
            return res
                .status(403)
                .json({
                    success: false,

                    code:
                        "PASSWORD_CHANGE_REQUIRED",

                    message:
                        "You must change your temporary password before accessing BankSync.",
                });
        }

        return next();
    } catch (error) {
        if (
            error instanceof
            jwt.JsonWebTokenError
        ) {
            return res
                .status(401)
                .json({
                    success: false,
                    message:
                        "Invalid or expired access token",
                });
        }

        return next(error);
    }
};
