import mongoose, { Schema } from "mongoose";

const reconciliationSchema = new Schema(
    {
        sourceUploadId: {
            type: Schema.Types.ObjectId,
            ref: "Upload",
            required: true,
        },

        targetUploadId: {
            type: Schema.Types.ObjectId,
            ref: "Upload",
            required: true,
        },

        startedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        status: {
            type: String,
            enum: [
                "PENDING",
                "PROCESSING",
                "COMPLETED",
                "FAILED",
            ],
            default: "PENDING",
        },

        totalTransactions: {
            type: Number,
            default: 0,
        },

        matchedCount: {
            type: Number,
            default: 0,
        },

        unmatchedCount: {
            type: Number,
            default: 0,
        },

        mismatchCount: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

export const Reconciliation = mongoose.model(
    "Reconciliation",
    reconciliationSchema
);