import mongoose from "mongoose";
import type {
    Request,
    Response,
} from "express";

import { Upload } from "./upload.model.js";
import { UploadRejectedRow } from "./upload.rejection.model.js";

import { Transaction } from "../transactions/transaction.model.js";

import { DataQualityIssue } from "../data-quality/data-quality.model.js";

import { Reconciliation } from "../reconciliation/reconciliation.model.js";

export const deleteUpload = async (
    req: Request,
    res: Response
) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid upload ID",
            });
        }

        const upload = await Upload.findById(id);

        if (!upload) {
            return res.status(404).json({
                success: false,
                message: "Upload not found",
            });
        }

        const currentUserId =
            res.locals.user.userId.toString();

        const currentUserRole =
            res.locals.user.role;

        const isAdmin =
            currentUserRole === "ADMIN";

        const isOriginalUploader =
            upload.uploadedBy.toString() ===
            currentUserId;

        if (
            !isAdmin &&
            !isOriginalUploader
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "You can only delete files that you uploaded",
            });
        }

        const reconciliationExists =
            await Reconciliation.exists({
                $or: [
                    {
                        sourceUploadId:
                            upload._id,
                    },
                    {
                        targetUploadId:
                            upload._id,
                    },
                ],
            });

        if (reconciliationExists) {
            return res.status(409).json({
                success: false,
                message:
                    "This upload cannot be deleted because it has already been used in reconciliation",
            });
        }

        await DataQualityIssue.deleteMany({
            uploadId: upload._id,
        });

        await UploadRejectedRow.deleteMany({
            uploadId: upload._id,
        });

        await Transaction.deleteMany({
            uploadId: upload._id,
        });

        await Upload.deleteOne({
            _id: upload._id,
        });

        return res.status(200).json({
            success: true,
            message:
                "Upload deleted successfully",
        });
    } catch (error) {
        console.error(
            "Delete upload error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to delete upload",
        });
    }
};