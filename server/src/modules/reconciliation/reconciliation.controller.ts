import mongoose from "mongoose";
import type { Request, Response } from "express";

import { Upload } from "../uploads/upload.model.js";
import { Reconciliation } from "./reconciliation.model.js";
import { ReconciliationResult } from "./reconciliation-result.model.js";
import { runExactMatching } from "./reconciliation.service.js";
import { generateExceptions } from "../exceptions/exception.service.js";

export const createReconciliation = async (
    req: Request,
    res: Response
) => {
    let reconciliationId: mongoose.Types.ObjectId | null = null;

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

        const uploadsReady = [sourceUpload, targetUpload].every(
            (upload) =>
                upload.status === "VALIDATED" ||
                upload.status === "COMPLETED"
        );

        if (!uploadsReady) {
            return res.status(409).json({
                success: false,
                message:
                    "Both uploads must be fully processed before reconciliation",
            });
        }

        reconciliationId = new mongoose.Types.ObjectId();

        const reconciliation = await Reconciliation.create({
            _id: reconciliationId,
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

        reconciliation.totalTransactions = result.totalTransactions;
        reconciliation.matchedCount = result.matchedCount;
        reconciliation.probableMatchCount = result.probableMatchCount;
        reconciliation.unmatchedCount = result.unmatchedCount;
        reconciliation.mismatchCount = result.mismatchCount;
        reconciliation.matchingCompletedAt = new Date();

        // Persist matching progress before creating exceptions and cases.
        // The run remains PROCESSING until every stage has succeeded.
        await reconciliation.save();

        await generateExceptions(
            reconciliation._id.toString()
        );

        reconciliation.status = "COMPLETED";

        await reconciliation.save();

        return res.status(201).json({
            success: true,
            message: "Reconciliation completed successfully",
            data: reconciliation,
        });
    } catch (error) {
        console.error("Reconciliation error:", error);

        if (reconciliationId) {
            try {
                await Reconciliation.updateOne(
                    {
                        _id: reconciliationId,
                        status: "PROCESSING",
                    },
                    {
                        $set: { status: "FAILED" },
                    }
                );
            } catch (statusError) {
                console.error(
                    "Unable to mark reconciliation as failed:",
                    statusError
                );
            }
        }

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

        if (reconciliation.status !== "COMPLETED") {
            return res.status(409).json({
                success: false,
                message:
                    "Reconciliation results are available only after processing completes",
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