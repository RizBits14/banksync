import crypto from "node:crypto";
import mongoose from "mongoose";
import type { Request, Response } from "express";

import {
    Upload,
    type SourceSystem,
} from "./upload.model.js";
import {
    parseUploadedFile,
    UploadHeaderError,
    type ParsedRecord,
} from "./upload.parser.js";
import { processTransactionBatch } from "../transactions/transaction.batch.js";
import { Transaction } from "../transactions/transaction.model.js";
import {
    saveTransactions,
    TransactionCleanupError,
} from "../transactions/transaction.service.js";
import {
    validateColumnMapping,
    type ColumnMapping,
} from "./upload.mapper.js";

export const createUpload = async (
    req: Request,
    res: Response
) => {
    try {
        const file = req.file;

        const { sourceSystem, mapping } = req.body as {
            sourceSystem: SourceSystem;
            mapping: ColumnMapping;
        };

        if (!file) {
            return res.status(400).json({
                success: false,
                message: "File is required",
            });
        }

        const fileHash = crypto
            .createHash("sha256")
            .update(file.buffer)
            .digest("hex");

        const existingUpload = await Upload.findOne({
            fileHash,
        });

        if (existingUpload && existingUpload.status !== "FAILED") {
            return res.status(409).json({
                success: false,
                message: "This file has already been uploaded",
            });
        }

        if (existingUpload) {
            if (
                res.locals.user.role !== "ADMIN" &&
                existingUpload.uploadedBy.toString() !==
                    res.locals.user.userId.toString()
            ) {
                return res.status(403).json({
                    success: false,
                    message: "Only the original uploader or an Admin can retry this file",
                });
            }

            if (existingUpload.sourceSystem !== sourceSystem) {
                return res.status(409).json({
                    success: false,
                    message: "Retry the file using its original source system",
                });
            }
        }

        let records: ParsedRecord[];

        try {
            records = await parseUploadedFile(
                file.buffer,
                file.mimetype
            );
        } catch (error) {
            return res.status(400).json({
                success: false,
                message:
                    error instanceof UploadHeaderError
                        ? error.message
                        : "File could not be read. Upload a valid CSV or .xlsx file with a header row and transaction rows",
            });
        }

        if (records.length === 0) {
            return res.status(400).json({
                success: false,
                message: "File contains no transaction rows",
            });
        }

        const mappingErrors = validateColumnMapping(
            mapping,
            Object.keys(records[0] ?? {})
        );

        if (mappingErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Column mapping does not match the uploaded file",
                errors: mappingErrors,
            });
        }

        const processed = processTransactionBatch(
            records,
            mapping
        );

        if (processed.validRows === 0) {
            return res.status(400).json({
                success: false,
                message: "File contains no valid transaction rows",
                data: {
                    totalRows: processed.totalRows,
                    validRows: processed.validRows,
                    invalidRows: processed.invalidRows,
                    validationErrors: processed.validationErrors,
                    validationErrorsTruncated:
                        processed.validationErrorsTruncated,
                },
            });
        }

        const upload = existingUpload
            ? await Upload.findOneAndUpdate(
                {
                    _id: existingUpload._id,
                    status: "FAILED",
                    sourceSystem,
                    uploadedBy: existingUpload.uploadedBy,
                    updatedAt: existingUpload.updatedAt,
                },
                {
                    $set: {
                        status: "PROCESSING",
                        totalRows: processed.totalRows,
                        validRows: processed.validRows,
                        invalidRows: processed.invalidRows,
                    },
                },
                { returnDocument: "after", runValidators: true }
            )
            : await Upload.create({
                fileName: `${Date.now()}-${file.originalname}`,
                originalName: file.originalname,
                fileHash,
                sourceSystem,
                uploadedBy: res.locals.user.userId,
                status: "PROCESSING",
                totalRows: processed.totalRows,
                validRows: processed.validRows,
                invalidRows: processed.invalidRows,
            });

        if (!upload) {
            return res.status(409).json({
                success: false,
                message: "The upload has changed or another retry has started",
            });
        }

        // A failed final status save can leave a complete batch behind.
        // Remove old rows only after exclusively claiming the failed upload.
        // Cleanup errors leave PROCESSING and are handled by the outer catch.
        if (existingUpload) {
            await Transaction.deleteMany({ uploadId: upload._id });
        }

        try {
            await saveTransactions(
                upload._id,
                sourceSystem,
                processed.validRecords
            );

            upload.status = "VALIDATED";
            await upload.save();
        } catch (error) {
            if (error instanceof TransactionCleanupError) {
                throw error;
            }

            try {
                await Upload.updateOne(
                    {
                        _id: upload._id,
                        status: "PROCESSING",
                    },
                    {
                        $set: { status: "FAILED" },
                    }
                );
            } catch (statusError) {
                console.error(
                    "Unable to mark upload as failed:",
                    statusError
                );
            }

            throw error;
        }

        return res.status(existingUpload ? 200 : 201).json({
            success: true,
            message: existingUpload
                ? "File retried and validated successfully"
                : "File uploaded and validated successfully",
            data: {
                id: upload._id,
                fileName: upload.fileName,
                originalName: upload.originalName,
                sourceSystem: upload.sourceSystem,
                status: upload.status,
                totalRows: upload.totalRows,
                validRows: upload.validRows,
                invalidRows: upload.invalidRows,
                createdAt: upload.createdAt,
                validationErrors: processed.validationErrors,
                validationErrorsTruncated:
                    processed.validationErrorsTruncated,
            },
        });
    } catch (error) {
        if (
            error instanceof mongoose.mongo.MongoServerError &&
            error.code === 11000 &&
            error.keyPattern?.fileHash
        ) {
            return res.status(409).json({
                success: false,
                message: "This file has already been uploaded",
            });
        }

        console.error("Upload error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to upload and process file",
        });
    }
};

export const getUploads = async (
    _req: Request,
    res: Response
) => {
    try {
        const uploads = await Upload.find()
            .select("-fileHash -__v")
            .populate(
                "uploadedBy",
                "name email role"
            )
            .sort({
                createdAt: -1,
            });

        return res.status(200).json({
            success: true,
            data: uploads,
        });
    } catch (error) {
        console.error("Get uploads error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve uploads",
        });
    }
};
