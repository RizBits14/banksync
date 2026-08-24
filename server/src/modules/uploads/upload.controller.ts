import crypto from "node:crypto";
import type { Request, Response } from "express";

import { Upload } from "./upload.model.js";

export const createUpload = async (
    req: Request,
    res: Response
) => {
    try {
        const file = req.file;
        const { sourceSystem } = req.body;

        if (!file) {
            return res.status(400).json({
                success: false,
                message: "File is required",
            });
        }

        if (!sourceSystem) {
            return res.status(400).json({
                success: false,
                message: "Source system is required",
            });
        }

        const fileHash = crypto
            .createHash("sha256")
            .update(file.buffer)
            .digest("hex");

        const existingUpload = await Upload.findOne({ fileHash });

        if (existingUpload) {
            return res.status(409).json({
                success: false,
                message: "This file has already been uploaded",
            });
        }

        const upload = await Upload.create({
            fileName: `${Date.now()}-${file.originalname}`,
            originalName: file.originalname,
            fileHash,
            sourceSystem,
            uploadedBy: res.locals.user.userId,
        });

        return res.status(201).json({
            success: true,
            message: "File uploaded successfully",
            data: upload,
        });
    } catch (error) {
        console.error("Upload error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to upload file",
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
            .populate("uploadedBy", "name email role")
            .sort({ createdAt: -1 });

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