import type {
    Request,
} from "express";

import rateLimit from "express-rate-limit";

const isProduction =
    process.env.NODE_ENV ===
    "production";

/*
 * Requests that already have their own stricter
 * authentication limiter should not also consume
 * the global API limiter.
 *
 * This prevents a user from being blocked by the
 * generic "Too many requests" limit before the
 * authentication-specific control can respond.
 */
const hasDedicatedAuthLimiter = (
    req: Request
) => {
    const path =
        req.originalUrl
            .split("?")[0]
            .replace(/\/+$/, "");

    return (
        path.endsWith(
            "/auth/login"
        ) ||
        path.endsWith(
            "/auth/register"
        )
    );
};

export const apiLimiter =
    rateLimit({
        windowMs:
            15 * 60 * 1000,

        /*
         * Keep production conservative.
         * Development performs many reloads and
         * test requests, so use a larger allowance
         * without weakening the production limit.
         */
        limit:
            isProduction
                ? 300
                : 3000,

        standardHeaders:
            true,

        legacyHeaders:
            false,

        skip:
            hasDedicatedAuthLimiter,

        message: {
            success: false,

            message:
                "Too many requests. Please try again later.",
        },
    });

export const authLimiter =
    rateLimit({
        windowMs:
            15 * 60 * 1000,

        limit:
            isProduction
                ? 30
                : 100,

        standardHeaders:
            true,

        legacyHeaders:
            false,

        /*
         * Successful authentication should not
         * consume the failed-attempt budget.
         * Failed login attempts still count.
         */
        skipSuccessfulRequests:
            true,

        message: {
            success: false,

            message:
                "Too many authentication attempts. Please try again later.",
        },
    });
