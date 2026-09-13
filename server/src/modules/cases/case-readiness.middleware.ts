import mongoose from "mongoose";
import type { NextFunction, Request, Response } from "express";

import { Case } from "./case.model.js";
import { Exception } from "../exceptions/exception.model.js";
import { Reconciliation } from "../reconciliation/reconciliation.model.js";

export const requireCompletedCaseReconciliation = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { id } = req.params;

        if (
            typeof id !== "string" ||
            !mongoose.isValidObjectId(id)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid case ID",
            });
        }

        const caseRecord = await Case.findById(id)
            .select("exceptionId assignedTo")
            .lean();

        if (!caseRecord) {
            return res.status(404).json({
                success: false,
                message: "Case not found",
            });
        }

        const currentUser = res.locals.user;

        if (
            currentUser.role === "MAKER" &&
            caseRecord.assignedTo?.toString() !== currentUser.userId
        ) {
            return res.status(403).json({
                success: false,
                message: "This case is not assigned to you",
            });
        }

        const exception = await Exception.findById(caseRecord.exceptionId)
            .select("reconciliationId")
            .lean();

        if (!exception) {
            return res.status(409).json({
                success: false,
                message: "The exception linked to this case is unavailable",
            });
        }

        const reconciliation = await Reconciliation.findById(
            exception.reconciliationId
        )
            .select("status")
            .lean();

        if (!reconciliation) {
            return res.status(409).json({
                success: false,
                message: "The reconciliation linked to this case is unavailable",
            });
        }

        if (reconciliation.status !== "COMPLETED") {
            return res.status(409).json({
                success: false,
                message:
                    "Case actions are available only after reconciliation completes successfully",
            });
        }

        return next();
    } catch (error) {
        console.error("Check case reconciliation error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to verify case reconciliation",
        });
    }
};
