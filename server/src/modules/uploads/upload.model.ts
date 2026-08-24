import mongoose, { Schema } from "mongoose";

const uploadSchema = new Schema(
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
            enum: [
                "CBS",
                "ATM",
                "INTERNET_BANKING",
                "MOBILE_BANKING",
                "PAYMENT_GATEWAY",
                "GENERAL_LEDGER",
                "REMITTANCE",
            ],
            required: true,
        },

        uploadedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        status: {
            type: String,
            enum: [
                "UPLOADED",
                "VALIDATING",
                "VALIDATED",
                "REJECTED",
                "PROCESSING",
                "COMPLETED",
                "FAILED",
            ],
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

export const Upload = mongoose.model("Upload", uploadSchema);