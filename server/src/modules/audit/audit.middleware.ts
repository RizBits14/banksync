import type {
    Request,
    Response,
    NextFunction,
} from "express";

import { AuditLog } from "./audit.model.js";

const MUTATING_METHODS = new Set([
    "POST",
    "PATCH",
    "PUT",
    "DELETE",
]);

export const auditRequest = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (
        !MUTATING_METHODS.has(req.method)
    ) {
        return next();
    }

    res.on("finish", () => {
        const currentUser =
            res.locals.user;

        void AuditLog.create({
            actorId:
                currentUser?.userId || null,

            actorRole:
                currentUser?.role || null,

            method: req.method,

            path: req.originalUrl,

            statusCode: res.statusCode,

            success:
                res.statusCode >= 200 &&
                res.statusCode < 400,

            ip:
                req.ip ||
                req.socket.remoteAddress ||
                "",

            userAgent:
                req.get("user-agent") || "",
        }).catch((error) => {
            console.error(
                "Audit log error:",
                error
            );
        });
    });

    next();
};