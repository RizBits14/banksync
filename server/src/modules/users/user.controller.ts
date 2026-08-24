import type { Request, Response } from "express";
import mongoose from "mongoose";
import { User } from "./user.model.js";

export const getUsers = async (_req: Request, res: Response) => {
    try {
        const users = await User.find()
            .select("-password")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: users,
        });
    } catch (error) {
        console.error("Get users error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve users",
        });
    }
};

export const getUserById = async (
    req: Request,
    res: Response
) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID",
            });
        }

        const user = await User.findById(id).select("-password -__v");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        console.error("Get user error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve user",
        });
    }
};

export const updateUserRole = async (
    req: Request,
    res: Response
) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID",
            });
        }

        if (res.locals.user.userId === id) {
            return res.status(400).json({
                success: false,
                message: "You cannot change your own role",
            });
        }

        const user = await User.findByIdAndUpdate(
            id,
            { role },
            { new: true }
        ).select("-password -__v");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "User role updated successfully",
            data: user,
        });
    } catch (error) {
        console.error("Update user role error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update user role",
        });
    }
};

export const updateUserStatus = async (
    req: Request,
    res: Response
) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID",
            });
        }

        const user = await User.findByIdAndUpdate(
            id,
            { isActive },
            { new: true }
        ).select("-password -__v");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "User status updated successfully",
            data: user,
        });
    } catch (error) {
        console.error("Update user status error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update user status",
        });
    }
};