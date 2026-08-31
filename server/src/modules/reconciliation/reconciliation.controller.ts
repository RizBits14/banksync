import mongoose from "mongoose";
import type { Request, Response } from "express";

import { Upload } from "../uploads/upload.model.js";
import { Reconciliation } from "./reconciliation.model.js";
import { ReconciliationResult } from "./reconciliation-result.model.js";
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
            reconciliation._id,
            sourceUploadId,
            targetUploadId
        );

        reconciliation.status = "COMPLETED";
        reconciliation.totalTransactions = result.totalTransactions;
        reconciliation.matchedCount = result.matchedCount;
        reconciliation.probableMatchCount = result.probableMatchCount;
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

export const getReconciliationResults = async (
    req: Request,
    res: Response
) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid reconciliation ID",
            });
        }

        const reconciliation = await Reconciliation.findById(id);

        if (!reconciliation) {
            return res.status(404).json({
                success: false,
                message: "Reconciliation not found",
            });
        }

        const results = await ReconciliationResult.find({
            reconciliationId: id,
        })
            .populate("sourceTransactionId")
            .populate("targetTransactionId")
            .select("-__v");

        return res.status(200).json({
            success: true,
            data: results,
        });
    } catch (error) {
        console.error("Get reconciliation results error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve reconciliation results",
        });
    }
};

export const getReconciliations = async (
    _req: Request,
    res: Response
) => {
    try {
        const reconciliations = await Reconciliation.find()
            .select("-__v")
            .populate(
                "startedBy",
                "name email role"
            )
            .populate(
                "sourceUploadId",
                "originalName sourceSystem"
            )
            .populate(
                "targetUploadId",
                "originalName sourceSystem"
            )
            .sort({
                createdAt: -1,
            });

        return res.status(200).json({
            success: true,
            data: reconciliations,
        });
    } catch (error) {
        console.error(
            "Get reconciliations error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve reconciliations",
        });
    }
};