import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { User } from "../users/user.model.js";

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

        const jwtSecret = process.env.JWT_SECRET;

        if (!jwtSecret) {
            throw new Error("JWT_SECRET is not defined");
        }

        const token = jwt.sign(
            {
                userId: user._id,
                role: user.role,
            },
            jwtSecret,
            {
                expiresIn: "15m",
            }
        );

        res.cookie("accessToken", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite:
                process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 15 * 60 * 1000,
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
        console.error("Auth error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to login",
        });
    }
};