import { extname } from "node:path";
import type { RequestHandler } from "express";
import multer from "multer";

const XLSX_MIMETYPE =
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const CSV_MIMETYPES = new Set([
    "text/csv",
    "application/csv",
    "application/vnd.ms-excel",
    "text/plain",
    "application/octet-stream",
]);

class UnsupportedUploadTypeError extends Error {
    constructor() {
        super("Only CSV (.csv) and Excel (.xlsx) files are allowed");
        this.name = "UnsupportedUploadTypeError";
    }
}

const receiveFile = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1,
    },

    fileFilter: (_req, file, cb) => {
        const extension = extname(file.originalname).toLowerCase();
        const mimetype = file.mimetype.toLowerCase();

        if (extension === ".csv" && CSV_MIMETYPES.has(mimetype)) {
            file.mimetype = "text/csv";
            return cb(null, true);
        }

        if (
            extension === ".xlsx" &&
            (
                mimetype === XLSX_MIMETYPE ||
                mimetype === "application/octet-stream"
            )
        ) {
            file.mimetype = XLSX_MIMETYPE;
            return cb(null, true);
        }

        return cb(new UnsupportedUploadTypeError());
    },
}).single("file");

export const uploadFile: RequestHandler = (req, res, next) => {
    receiveFile(req, res, (error?: unknown) => {
        if (error instanceof UnsupportedUploadTypeError) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }

        if (error instanceof multer.MulterError) {
            if (error.code === "LIMIT_FILE_SIZE") {
                return res.status(413).json({
                    success: false,
                    message: "File size must be below 10 MB",
                });
            }

            const invalidFileCountOrField =
                error.code === "LIMIT_FILE_COUNT" ||
                error.code === "LIMIT_UNEXPECTED_FILE";

            return res.status(400).json({
                success: false,
                message: invalidFileCountOrField
                    ? "Upload one file using the form-data field named 'file'"
                    : error.message,
            });
        }

        if (error) {
            return next(error);
        }

        next();
    });
};