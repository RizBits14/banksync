import mongoose from "mongoose";
import type { Request, Response } from "express";

import { Case } from "./case.model.js";
import { Exception } from "../exceptions/exception.model.js";
import { User } from "../users/user.model.js";

export const getCases = async (
    _req: Request,
    res: Response
) => {
    try {
        const currentUser = res.locals.user;

        const filter =
            currentUser.role === "MAKER"
                ? {
                    assignedTo: currentUser.userId,
                }
                : {};

        const cases = await Case.find(filter)
            .select("-__v")
            .populate({
                path: "exceptionId",
                select:
                    "exceptionType score reasons status transactionId reconciliationId",

                populate: {
                    path: "transactionId",
                    select:
                        "transactionId sourceSystem referenceNumber accountNumber amount transactionDate status",
                },
            })
            .populate(
                "assignedTo",
                "name email role"
            )
            .populate(
                "assignedBy",
                "name email role"
            )
            .populate(
                "submittedBy",
                "name email role"
            )
            .populate(
                "checkedBy",
                "name email role"
            )
            .sort({
                createdAt: -1,
            });

        return res.status(200).json({
            success: true,
            data: cases,
        });
    } catch (error) {
        console.error("Get cases error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve cases",
        });
    }
};

export const getCaseById = async (
    req: Request,
    res: Response
) => {
    try {
        const { id } = req.params;
        const currentUser = res.locals.user;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid case ID",
            });
        }

        const caseRecord = await Case.findById(id)
            .select("-__v")
            .populate({
                path: "exceptionId",
                populate: {
                    path: "transactionId",
                },
            })
            .populate(
                "assignedTo",
                "name email role"
            )
            .populate(
                "assignedBy",
                "name email role"
            )
            .populate(
                "submittedBy",
                "name email role"
            )
            .populate(
                "checkedBy",
                "name email role"
            );

        if (!caseRecord) {
            return res.status(404).json({
                success: false,
                message: "Case not found",
            });
        }

        if (
            currentUser.role === "MAKER" &&
            caseRecord.assignedTo?._id.toString() !==
            currentUser.userId
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "You are not assigned to this case",
            });
        }

        return res.status(200).json({
            success: true,
            data: caseRecord,
        });
    } catch (error) {
        console.error("Get case error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve case",
        });
    }
};

export const assignCase = async (
    req: Request,
    res: Response
) => {
    try {
        const { id } = req.params;
        const { makerId } = req.body;

        if (
            !mongoose.isValidObjectId(id) ||
            !mongoose.isValidObjectId(makerId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid case or Maker ID",
            });
        }

        const maker = await User.findById(
            makerId
        );

        if (
            !maker ||
            !maker.isActive ||
            maker.role !== "MAKER"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Selected user must be an active Maker",
            });
        }

        const caseRecord = await Case.findById(
            id
        );

        if (!caseRecord) {
            return res.status(404).json({
                success: false,
                message: "Case not found",
            });
        }

        if (
            !["OPEN", "ASSIGNED"].includes(
                caseRecord.status
            )
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Case cannot be assigned in its current status",
            });
        }

        caseRecord.assignedTo = maker._id;
        caseRecord.assignedBy =
            res.locals.user.userId;
        caseRecord.assignedAt = new Date();
        caseRecord.status = "ASSIGNED";

        await caseRecord.save();

        await Exception.findByIdAndUpdate(
            caseRecord.exceptionId,
            {
                status: "ASSIGNED",
            }
        );

        return res.status(200).json({
            success: true,
            message: "Case assigned successfully",
            data: caseRecord,
        });
    } catch (error) {
        console.error("Assign case error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to assign case",
        });
    }
};

export const startInvestigation = async (
    req: Request,
    res: Response
) => {
    try {
        const { id } = req.params;
        const makerId = res.locals.user.userId;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid case ID",
            });
        }

        const caseRecord = await Case.findById(
            id
        );

        if (!caseRecord) {
            return res.status(404).json({
                success: false,
                message: "Case not found",
            });
        }

        if (
            caseRecord.assignedTo?.toString() !==
            makerId
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "This case is not assigned to you",
            });
        }

        if (
            ![
                "ASSIGNED",
                "RETURNED_TO_MAKER",
            ].includes(caseRecord.status)
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Investigation cannot be started in the current status",
            });
        }

        caseRecord.status =
            "UNDER_INVESTIGATION";

        caseRecord.investigationStartedAt =
            new Date();

        await caseRecord.save();

        return res.status(200).json({
            success: true,
            message: "Investigation started",
            data: caseRecord,
        });
    } catch (error) {
        console.error(
            "Start investigation error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to start investigation",
        });
    }
};

export const updateInvestigation = async (
    req: Request,
    res: Response
) => {
    try {
        const { id } = req.params;

        const {
            investigationNotes,
            proposedResolution,
        } = req.body;

        const makerId =
            res.locals.user.userId;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid case ID",
            });
        }

        const caseRecord = await Case.findById(
            id
        );

        if (!caseRecord) {
            return res.status(404).json({
                success: false,
                message: "Case not found",
            });
        }

        if (
            caseRecord.assignedTo?.toString() !==
            makerId
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "This case is not assigned to you",
            });
        }

        if (
            caseRecord.status !==
            "UNDER_INVESTIGATION"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Case is not under investigation",
            });
        }

        if (
            investigationNotes !== undefined
        ) {
            caseRecord.investigationNotes =
                investigationNotes;
        }

        if (
            proposedResolution !== undefined
        ) {
            caseRecord.proposedResolution =
                proposedResolution;
        }

        await caseRecord.save();

        return res.status(200).json({
            success: true,
            message:
                "Investigation updated successfully",
            data: caseRecord,
        });
    } catch (error) {
        console.error(
            "Update investigation error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to update investigation",
        });
    }
};

export const submitCase = async (
    req: Request,
    res: Response
) => {
    try {
        const { id } = req.params;
        const makerId =
            res.locals.user.userId;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid case ID",
            });
        }

        const caseRecord = await Case.findById(
            id
        );

        if (!caseRecord) {
            return res.status(404).json({
                success: false,
                message: "Case not found",
            });
        }

        if (
            caseRecord.assignedTo?.toString() !==
            makerId
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "This case is not assigned to you",
            });
        }

        if (
            caseRecord.status !==
            "UNDER_INVESTIGATION"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Case cannot be submitted in the current status",
            });
        }

        if (
            !caseRecord.proposedResolution.trim()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Proposed resolution is required before submission",
            });
        }

        caseRecord.status =
            "PENDING_CHECKER_APPROVAL";

        caseRecord.submittedBy =
            res.locals.user.userId;

        caseRecord.submittedAt =
            new Date();

        caseRecord.checkedBy = null;
        caseRecord.checkerComment = "";
        caseRecord.resolvedAt = null;

        await caseRecord.save();

        return res.status(200).json({
            success: true,
            message:
                "Case submitted for Checker approval",
            data: caseRecord,
        });
    } catch (error) {
        console.error(
            "Submit case error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to submit case",
        });
    }
};