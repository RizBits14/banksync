import type {
    Request,
    Response,
} from "express";

import mongoose from "mongoose";

import { User } from "./user.model.js";

import {
    createBusinessAudit,
} from "../audit/audit.service.js";

const getSingleParam = (
    value:
        | string
        | string[]
        | undefined
): string | undefined => {
    if (Array.isArray(value)) {
        return value[0];
    }

    return value;
};

export const getUsers = async (
    _req: Request,
    res: Response
) => {
    try {
        const users =
            await User.find()
                .select(
                    "-password -__v"
                )
                .sort({
                    createdAt: -1,
                });

        return res.status(200).json({
            success: true,
            data: users,
        });
    } catch (error) {
        console.error(
            "Get users error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to retrieve users",
        });
    }
};

export const getActiveMakers =
    async (
        _req: Request,
        res: Response
    ) => {
        try {
            const makers =
                await User.find({
                    role: "MAKER",
                    isActive: true,
                })
                    .select(
                        "name email role isActive"
                    )
                    .sort({
                        name: 1,
                    });

            return res
                .status(200)
                .json({
                    success: true,
                    data: makers,
                });
        } catch (error) {
            console.error(
                "Get active makers error:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,
                    message:
                        "Unable to retrieve active Makers",
                });
        }
    };

export const getUserById =
    async (
        req: Request,
        res: Response
    ) => {
        try {
            const id =
                getSingleParam(
                    req.params.id
                );

            if (
                !id ||
                !mongoose.isValidObjectId(
                    id
                )
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Invalid user ID",
                    });
            }

            const user =
                await User.findById(
                    id
                ).select(
                    "-password -__v"
                );

            if (!user) {
                return res
                    .status(404)
                    .json({
                        success: false,
                        message:
                            "User not found",
                    });
            }

            return res
                .status(200)
                .json({
                    success: true,
                    data: user,
                });
        } catch (error) {
            console.error(
                "Get user error:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,
                    message:
                        "Unable to retrieve user",
                });
        }
    };

export const updateUserRole =
    async (
        req: Request,
        res: Response
    ) => {
        try {
            const id =
                getSingleParam(
                    req.params.id
                );

            const { role } =
                req.body;

            const currentUser =
                res.locals.user;

            if (
                !id ||
                !mongoose.isValidObjectId(
                    id
                )
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Invalid user ID",
                    });
            }

            if (
                currentUser.userId ===
                id
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "You cannot change your own role",
                    });
            }

            const user =
                await User.findById(
                    id
                );

            if (!user) {
                return res
                    .status(404)
                    .json({
                        success: false,
                        message:
                            "User not found",
                    });
            }

            /*
             * Protect the final active Admin
             * from being demoted.
             */
            if (
                user.role ===
                    "ADMIN" &&
                user.isActive &&
                role !== "ADMIN"
            ) {
                const activeAdminCount =
                    await User.countDocuments(
                        {
                            role: "ADMIN",
                            isActive: true,
                        }
                    );

                if (
                    activeAdminCount <=
                    1
                ) {
                    return res
                        .status(409)
                        .json({
                            success:
                                false,

                            message:
                                "The last active Admin cannot be assigned another role",
                        });
                }
            }

            const previousRole =
                user.role;

            user.role = role;

            await user.save();

            await createBusinessAudit({
                actorId:
                    currentUser.userId,

                actorRole:
                    currentUser.role,

                entityType:
                    "USER",

                entityId:
                    user._id.toString(),

                action:
                    "USER_ROLE_CHANGED",

                description:
                    "User role was changed",

                metadata: {
                    previousRole,
                    newRole: role,
                },
            });

            const safeUser =
                await User.findById(
                    user._id
                ).select(
                    "-password -__v"
                );

            return res
                .status(200)
                .json({
                    success: true,

                    message:
                        "User role updated successfully",

                    data: safeUser,
                });
        } catch (error) {
            console.error(
                "Update user role error:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,
                    message:
                        "Unable to update user role",
                });
        }
    };

export const updateUserStatus =
    async (
        req: Request,
        res: Response
    ) => {
        try {
            const id =
                getSingleParam(
                    req.params.id
                );

            const { isActive } =
                req.body;

            const currentUser =
                res.locals.user;

            if (
                !id ||
                !mongoose.isValidObjectId(
                    id
                )
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Invalid user ID",
                    });
            }

            /*
             * An Admin must not accidentally
             * lock themselves out.
             */
            if (
                currentUser.userId ===
                    id &&
                isActive === false
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,

                        message:
                            "You cannot deactivate your own account",
                    });
            }

            const user =
                await User.findById(
                    id
                );

            if (!user) {
                return res
                    .status(404)
                    .json({
                        success: false,
                        message:
                            "User not found",
                    });
            }

            /*
             * Protect the final active Admin
             * from being deactivated.
             */
            if (
                user.role ===
                    "ADMIN" &&
                user.isActive &&
                isActive === false
            ) {
                const activeAdminCount =
                    await User.countDocuments(
                        {
                            role: "ADMIN",
                            isActive: true,
                        }
                    );

                if (
                    activeAdminCount <=
                    1
                ) {
                    return res
                        .status(409)
                        .json({
                            success:
                                false,

                            message:
                                "The last active Admin cannot be deactivated",
                        });
                }
            }

            const previousStatus =
                user.isActive;

            user.isActive =
                isActive;

            await user.save();

            await createBusinessAudit({
                actorId:
                    currentUser.userId,

                actorRole:
                    currentUser.role,

                entityType:
                    "USER",

                entityId:
                    user._id.toString(),

                action:
                    isActive
                        ? "USER_ACTIVATED"
                        : "USER_DEACTIVATED",

                description:
                    isActive
                        ? "User account was activated"
                        : "User account was deactivated",

                metadata: {
                    previousStatus,
                    newStatus:
                        isActive,
                },
            });

            const safeUser =
                await User.findById(
                    user._id
                ).select(
                    "-password -__v"
                );

            return res
                .status(200)
                .json({
                    success: true,

                    message:
                        "User status updated successfully",

                    data: safeUser,
                });
        } catch (error) {
            console.error(
                "Update user status error:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,
                    message:
                        "Unable to update user status",
                });
        }
    };