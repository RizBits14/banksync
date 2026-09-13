import mongoose from "mongoose";
import type { Request, Response } from "express";

import { Upload } from "../uploads/upload.model.js";
import { Exception } from "../exceptions/exception.model.js";
import { generateExceptions } from "../exceptions/exception.service.js";
import { Reconciliation } from "./reconciliation.model.js";
import { ReconciliationResult } from "./reconciliation-result.model.js";
import { runExactMatching } from "./reconciliation.service.js";

export const retryReconciliation = async (
    req: Request,
    res: Response
) => {
    let claimedReconciliationId: mongoose.Types.ObjectId | null = null;

    try {
        const { id } = req.params;

        if (
            typeof id !== "string" ||
            !mongoose.isValidObjectId(id)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid reconciliation ID",
            });
        }

        const existing = await Reconciliation.findById(id);

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Reconciliation not found",
            });
        }

        if (
            res.locals.user.role !== "ADMIN" &&
            existing.startedBy.toString() !== res.locals.user.userId
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "Only the original Import Officer or an Admin can retry this reconciliation",
            });
        }

        if (existing.status !== "FAILED") {
            return res.status(409).json({
                success: false,
                message: "Only failed reconciliations can be retried",
            });
        }

        if (existing.sourceUploadId.equals(existing.targetUploadId)) {
            return res.status(409).json({
                success: false,
                message: "Source and target uploads must be different",
            });
        }

        const [sourceUpload, targetUpload] = await Promise.all([
            Upload.findById(existing.sourceUploadId),
            Upload.findById(existing.targetUploadId),
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

        if (existing.matchingCompletedAt) {
            const savedResultCount =
                await ReconciliationResult.countDocuments({
                    reconciliationId: existing._id,
                });

            if (savedResultCount !== existing.totalTransactions) {
                return res.status(409).json({
                    success: false,
                    message:
                        "Saved matching results are incomplete. Review this reconciliation before retrying",
                });
            }
        } else {
            // Older runs may have exceptions without a matching checkpoint.
            // Their result IDs must be preserved for investigation history.
            const existingException = await Exception.exists({
                reconciliationId: existing._id,
            });

            if (existingException) {
                return res.status(409).json({
                    success: false,
                    message:
                        "This reconciliation has exceptions but no matching checkpoint. Review it before retrying",
                });
            }
        }

        const reconciliation = await Reconciliation.findOneAndUpdate(
            {
                _id: existing._id,
                status: "FAILED",
                updatedAt: existing.updatedAt,
            },
            {
                $set: { status: "PROCESSING" },
            },
            {
                returnDocument: "after",
                runValidators: true,
            }
        );

        if (!reconciliation) {
            return res.status(409).json({
                success: false,
                message:
                    "The reconciliation has changed or another retry has started",
            });
        }

        // Only the request that acquired this run may process it or mark it failed.
        claimedReconciliationId = reconciliation._id;

        if (!reconciliation.matchingCompletedAt) {
            // No exceptions reference these uncheckpointed results.
            // Clear a partial matching batch only after acquiring the run.
            await ReconciliationResult.deleteMany({
                reconciliationId: reconciliation._id,
            });

            const result = await runExactMatching(
                reconciliation._id,
                reconciliation.sourceUploadId.toString(),
                reconciliation.targetUploadId.toString()
            );

            reconciliation.totalTransactions = result.totalTransactions;
            reconciliation.matchedCount = result.matchedCount;
            reconciliation.probableMatchCount = result.probableMatchCount;
            reconciliation.unmatchedCount = result.unmatchedCount;
            reconciliation.mismatchCount = result.mismatchCount;
            reconciliation.matchingCompletedAt = new Date();

            await reconciliation.save();
        }

        await generateExceptions(reconciliation._id.toString());

        reconciliation.status = "COMPLETED";
        await reconciliation.save();

        return res.status(200).json({
            success: true,
            message: "Reconciliation retried successfully",
            data: reconciliation,
        });
    } catch (error) {
        console.error("Retry reconciliation error:", error);

        if (claimedReconciliationId) {
            try {
                await Reconciliation.updateOne(
                    {
                        _id: claimedReconciliationId,
                        status: "PROCESSING",
                    },
                    {
                        $set: { status: "FAILED" },
                    }
                );
            } catch (statusError) {
                console.error(
                    "Unable to mark reconciliation retry as failed:",
                    statusError
                );
            }
        }

        return res.status(500).json({
            success: false,
            message: "Unable to retry reconciliation",
        });
    }
};
