import mongoose from "mongoose";
import type {
    Request,
    Response,
} from "express";

import { Case } from "./case.model.js";
import { Exception } from "../exceptions/exception.model.js";

export const approveCase = async (
    req: Request,
    res: Response
) => {
    try {
        const { id } = req.params;
        const { checkerComment = "" } =
            req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid case ID",
            });
        }

        const caseRecord =
            await Case.findById(id);

        if (!caseRecord) {
            return res.status(404).json({
                success: false,
                message: "Case not found",
            });
        }

        if (
            caseRecord.status !==
            "PENDING_CHECKER_APPROVAL"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Case is not waiting for Checker approval",
            });
        }

        caseRecord.status = "APPROVED";

        caseRecord.checkedBy =
            new mongoose.Types.ObjectId(
                res.locals.user.userId
            );

        caseRecord.checkerComment =
            checkerComment;

        caseRecord.resolvedAt =
            new Date();

        await caseRecord.save();

        await Exception.findByIdAndUpdate(
            caseRecord.exceptionId,
            {
                status: "RESOLVED",
            }
        );

        return res.status(200).json({
            success: true,
            message:
                "Case approved successfully",
            data: caseRecord,
        });
    } catch (error) {
        console.error(
            "Approve case error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to approve case",
        });
    }
};

export const returnCaseToMaker = async (
    req: Request,
    res: Response
) => {
    try {
        const { id } = req.params;
        const { checkerComment } =
            req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid case ID",
            });
        }

        const caseRecord =
            await Case.findById(id);

        if (!caseRecord) {
            return res.status(404).json({
                success: false,
                message: "Case not found",
            });
        }

        if (
            caseRecord.status !==
            "PENDING_CHECKER_APPROVAL"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Case is not waiting for Checker review",
            });
        }

        caseRecord.status =
            "RETURNED_TO_MAKER";

        caseRecord.checkedBy =
            new mongoose.Types.ObjectId(
                res.locals.user.userId
            );

        caseRecord.checkerComment =
            checkerComment;

        caseRecord.resolvedAt = null;

        await caseRecord.save();

        await Exception.findByIdAndUpdate(
            caseRecord.exceptionId,
            {
                status: "ASSIGNED",
            }
        );

        return res.status(200).json({
            success: true,
            message:
                "Case returned to Maker",
            data: caseRecord,
        });
    } catch (error) {
        console.error(
            "Return case error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to return case",
        });
    }
};