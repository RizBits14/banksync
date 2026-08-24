import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../modules/users/user.model.js";

export const authorizeRoles =
    (...allowedRoles: UserRole[]) =>
        (_req: Request, res: Response, next: NextFunction) => {
            const user = res.locals.user;

            if (!user || !allowedRoles.includes(user.role)) {
                return res.status(403).json({
                    success: false,
                    message: "You do not have permission to access this resource",
                });
            }

            next();
        };