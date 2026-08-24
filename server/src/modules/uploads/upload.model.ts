import mongoose, { Schema } from "mongoose";

export const SOURCE_SYSTEMS = [
    "CBS",
    "ATM",
    "INTERNET_BANKING",
    "MOBILE_BANKING",
    "PAYMENT_GATEWAY",
    "GENERAL_LEDGER",
    "REMITTANCE",
] as const;

export type SourceSystem =
    (typeof SOURCE_SYSTEMS)[number];

export const UPLOAD_STATUSES = [
    "UPLOADED",
    "VALIDATING",
    "VALIDATED",
    "REJECTED",
    "PROCESSING",
    "COMPLETED",
    "FAILED",
] as const;

export type UploadStatus =
    (typeof UPLOAD_STATUSES)[number];

interface IUpload {
    fileName: string;
    originalName: string;
    fileHash: string;

    sourceSystem: SourceSystem;

    uploadedBy: mongoose.Types.ObjectId;

    status: UploadStatus;

    totalRows: number;
    validRows: number;
    invalidRows: number;

    createdAt: Date;
    updatedAt: Date;
}

const uploadSchema = new Schema<IUpload>(
    {
        fileName: {
            type: String,
            required: true,
        },

        originalName: {
            type: String,
            required: true,
        },

        fileHash: {
            type: String,
            required: true,
            unique: true,
        },

        sourceSystem: {
            type: String,
            enum: SOURCE_SYSTEMS,
            required: true,
        },

        uploadedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        status: {
            type: String,
            enum: UPLOAD_STATUSES,
            default: "UPLOADED",
        },

        totalRows: {
            type: Number,
            default: 0,
        },

        validRows: {
            type: Number,
            default: 0,
        },

        invalidRows: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

export const Upload = mongoose.model<IUpload>(
    "Upload",
    uploadSchema
);