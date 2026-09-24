import mongoose from "mongoose";
import type {
    Request,
    Response,
} from "express";

import { Upload } from "./upload.model.js";
import { Reconciliation } from "../reconciliation/reconciliation.model.js";

export const archiveUpload = async (
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

        if (upload.isArchived) {
            return res.status(409).json({
                success: false,
                message:
                    "This upload is already archived",
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

        if (!reconciliationExists) {
            return res.status(409).json({
                success: false,
                message:
                    "This upload has not been used in reconciliation. Delete it instead of archiving it.",
            });
        }

        upload.isArchived = true;
        upload.archivedAt = new Date();
        upload.archivedBy =
            new mongoose.Types.ObjectId(
                res.locals.user.userId
            );

        await upload.save();

        return res.status(200).json({
            success: true,
            message:
                "Upload archived successfully",
            data: {
                id: upload._id,
                originalName:
                    upload.originalName,
                status:
                    upload.status,
                isArchived:
                    upload.isArchived,
                archivedAt:
                    upload.archivedAt,
                archivedBy:
                    upload.archivedBy,
            },
        });
    } catch (error) {
        console.error(
            "Archive upload error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to archive upload",
        });
    }
};