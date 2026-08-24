import jwt from "jsonwebtoken";
import type { UserRole } from "../users/user.model.js";

interface TokenPayload {
    userId: string;
    role: UserRole;
}

export const generateAccessToken = (payload: TokenPayload) => {
    const secret = process.env.ACCESS_TOKEN_SECRET;

    if (!secret) {
        throw new Error("ACCESS_TOKEN_SECRET is not defined");
    }

    return jwt.sign(payload, secret, {
        expiresIn: "15m",
    });
};

export const generateRefreshToken = (payload: TokenPayload) => {
    const secret = process.env.REFRESH_TOKEN_SECRET;

    if (!secret) {
        throw new Error("REFRESH_TOKEN_SECRET is not defined");
    }

    return jwt.sign(payload, secret, {
        expiresIn: "7d",
    });
};