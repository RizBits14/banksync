import mongoose from "mongoose";
import type { Request, Response } from "express";

import { Upload } from "../uploads/upload.model.js";
import { Reconciliation } from "./reconciliation.model.js";
import { runExactMatching } from "./reconciliation.service.js";

export const createReconciliation = async (
    req: Request,
    res: Response
) => {
    try {
        const { sourceUploadId, targetUploadId } = req.body;

        if (
            !mongoose.isValidObjectId(sourceUploadId) ||
            !mongoose.isValidObjectId(targetUploadId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid upload ID",
            });
        }

        if (sourceUploadId === targetUploadId) {
            return res.status(400).json({
                success: false,
                message: "Source and target uploads must be different",
            });
        }

        const [sourceUpload, targetUpload] = await Promise.all([
            Upload.findById(sourceUploadId),
            Upload.findById(targetUploadId),
        ]);

        if (!sourceUpload || !targetUpload) {
            return res.status(404).json({
                success: false,
                message: "Upload not found",
            });
        }

        const reconciliation = await Reconciliation.create({
            sourceUploadId,
            targetUploadId,
            startedBy: res.locals.user.userId,
            status: "PROCESSING",
        });

        const result = await runExactMatching(
            sourceUploadId,
            targetUploadId
        );

        reconciliation.status = "COMPLETED";
        reconciliation.totalTransactions = result.totalTransactions;
        reconciliation.matchedCount = result.matchedCount;
        reconciliation.unmatchedCount = result.unmatchedCount;
        reconciliation.mismatchCount = result.mismatchCount;

        await reconciliation.save();

        return res.status(201).json({
            success: true,
            message: "Reconciliation completed successfully",
            data: reconciliation,
        });
    } catch (error) {
        console.error("Reconciliation error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to complete reconciliation",
        });
    }
};