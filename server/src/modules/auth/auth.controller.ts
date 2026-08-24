import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";

import { AuthSession } from "./auth.session.model.js";
import {
    generateAccessToken,
    generateRefreshToken,
} from "./auth.token.js";

import { User, type UserRole } from "../users/user.model.js";

export const register = async (req: Request, res: Response) => {
    try {
        const { name, email, password, role } = req.body;

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User already exists",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role,
        });

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Unable to register user",
        });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const passwordMatches = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const payload = {
            userId: user._id.toString(),
            role: user.role,
        };

        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        const refreshTokenHash = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex");

        await AuthSession.create({
            userId: user._id,
            tokenHash: refreshTokenHash,
            expiresAt: new Date(
                Date.now() + 7 * 24 * 60 * 60 * 1000
            ),
        });

        const isProduction = process.env.NODE_ENV === "production";

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 15 * 60 * 1000,
        });

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to login",
        });
    }
};

export const refreshAccessToken = async (
    req: Request,
    res: Response
) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: "Refresh token required",
            });
        }

        const secret = process.env.REFRESH_TOKEN_SECRET;

        if (!secret) {
            throw new Error("REFRESH_TOKEN_SECRET is not defined");
        }

        const decoded = jwt.verify(refreshToken, secret) as {
            userId: string;
            role: UserRole;
        };

        const tokenHash = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex");

        const session = await AuthSession.findOne({
            userId: decoded.userId,
            tokenHash,
            revokedAt: null,
            expiresAt: { $gt: new Date() },
        });

        if (!session) {
            return res.status(401).json({
                success: false,
                message: "Refresh session is invalid",
            });
        }

        const user = await User.findById(decoded.userId);

        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: "User is unavailable",
            });
        }

        const accessToken = generateAccessToken({
            userId: user._id.toString(),
            role: user.role,
        });

        const isProduction = process.env.NODE_ENV === "production";

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 15 * 60 * 1000,
        });

        return res.status(200).json({
            success: true,
            message: "Access token refreshed successfully",
        });
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired refresh token",
        });
    }
};

export const logout = async (req: Request, res: Response) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (refreshToken) {
            const tokenHash = crypto
                .createHash("sha256")
                .update(refreshToken)
                .digest("hex");

            await AuthSession.findOneAndUpdate(
                {
                    tokenHash,
                    revokedAt: null,
                },
                {
                    revokedAt: new Date(),
                }
            );
        }

        const isProduction = process.env.NODE_ENV === "production";

        res.clearCookie("accessToken", {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
        });

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
        });

        return res.status(200).json({
            success: true,
            message: "Logout successful",
        });
    } catch (error) {
        console.error("Logout error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to logout",
        });
    }
};