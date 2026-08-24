import crypto from "node:crypto";
import type { Request, Response } from "express";

import {
    Upload,
    type SourceSystem,
} from "./upload.model.js";
import { parseUploadedFile } from "./upload.parser.js";
import { processTransactionBatch } from "../transactions/transaction.batch.js";
import { saveTransactions } from "../transactions/transaction.service.js";
import type { ColumnMapping } from "./upload.mapper.js";

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

        if (existingUpload) {
            return res.status(409).json({
                success: false,
                message: "This file has already been uploaded",
            });
        }

        const records = await parseUploadedFile(
            file.buffer,
            file.mimetype
        );

        const processed = processTransactionBatch(
            records,
            mapping
        );

        const upload = await Upload.create({
            fileName: `${Date.now()}-${file.originalname}`,
            originalName: file.originalname,
            fileHash,
            sourceSystem,
            uploadedBy: res.locals.user.userId,

            status: "VALIDATED",

            totalRows: processed.totalRows,
            validRows: processed.validRows,
            invalidRows: processed.invalidRows,
        });

        await saveTransactions(
            upload._id,
            sourceSystem,
            processed.validRecords
        );

        return res.status(201).json({
            success: true,
            message: "File uploaded and validated successfully",
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
            },
        });
    } catch (error) {
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