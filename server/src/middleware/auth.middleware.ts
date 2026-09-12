import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import { User } from "../modules/users/user.model.js";

export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const accessToken = req.cookies?.accessToken;

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

        const decoded = jwt.verify(accessToken, secret, {
            algorithms: ["HS256"],
        });

        if (
            typeof decoded !== "object" ||
            decoded === null ||
            typeof decoded.userId !== "string" ||
            !mongoose.isObjectIdOrHexString(decoded.userId)
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired access token",
            });
        }

        const user = await User.findById(decoded.userId)
            .select("_id role isActive")
            .lean();

        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: "User is unavailable",
            });
        }

        res.locals.user = {
            userId: user._id.toString(),
            role: user.role,
        };

        return next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired access token",
            });
        }

        return next(error);
    }
};