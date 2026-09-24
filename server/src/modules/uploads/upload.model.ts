import mongoose, {
    Schema,
} from "mongoose";

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
    "PARTIALLY_VALIDATED",
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

    uploadedBy:
        mongoose.Types.ObjectId;

    status: UploadStatus;

    totalRows: number;
    validRows: number;
    invalidRows: number;

    /*
     * ----------------------------------------
     * DATA CORRECTION VERSION LINKAGE
     * ----------------------------------------
     *
     * Normal upload:
     * correctionOfUploadId = null
     * correctionTaskId = null
     *
     * Corrected upload:
     * correctionOfUploadId = original upload
     * correctionTaskId = DataCorrectionTask
     *
     * The original upload itself is never
     * modified into the corrected version.
     */
    correctionOfUploadId:
        mongoose.Types.ObjectId | null;

    correctionTaskId:
        mongoose.Types.ObjectId | null;

    isArchived: boolean;
    archivedAt: Date | null;
    archivedBy:
        mongoose.Types.ObjectId | null;

    createdAt: Date;
    updatedAt: Date;
}

const uploadSchema =
    new Schema<IUpload>(
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
                type:
                    Schema.Types
                        .ObjectId,
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

            /*
             * ----------------------------------------
             * CORRECTION CHAIN
             * ----------------------------------------
             *
             * These fields connect a corrected
             * source extract back to:
             *
             * 1. the immutable original upload
             * 2. the DataCorrectionTask that
             *    authorized the correction
             *
             * They remain null for ordinary
             * uploads and existing historical
             * uploads.
             */

            correctionOfUploadId: {
                type:
                    Schema.Types
                        .ObjectId,

                ref: "Upload",

                default: null,

                index: true,
            },

            correctionTaskId: {
                type:
                    Schema.Types
                        .ObjectId,

                ref:
                    "DataCorrectionTask",

                default: null,

                index: true,
            },

            isArchived: {
                type: Boolean,
                default: false,
                index: true,
            },

            archivedAt: {
                type: Date,
                default: null,
            },

            archivedBy: {
                type:
                    Schema.Types
                        .ObjectId,

                ref: "User",

                default: null,
            },
        },
        {
            timestamps: true,
        }
    );

/*
 * Fast history lookup:
 *
 * original upload
 *      ↓
 * all correction attempts
 *
 * Multiple correction attempts are allowed
 * for the same task because verification can
 * fail and the Import Officer may need to
 * upload another corrected version.
 */
uploadSchema.index({
    correctionOfUploadId: 1,
    createdAt: -1,
});

uploadSchema.index({
    correctionTaskId: 1,
    createdAt: -1,
});

export const Upload =
    mongoose.model<IUpload>(
        "Upload",
        uploadSchema
    );
