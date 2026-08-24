import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export const authenticate = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const accessToken = req.cookies.accessToken;

        if (!accessToken) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        const secret = process.env.ACCESS_TOKEN_SECRET;

        if (!secret) {
            throw new Error("ACCESS_TOKEN_SECRET is not defined");
        }

        const decoded = jwt.verify(accessToken, secret);

        res.locals.user = decoded;

        next();
    } catch {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired access token",
        });
    }
};