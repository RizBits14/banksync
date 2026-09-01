import mongoose, { Schema } from "mongoose";

export const DATA_QUALITY_ISSUE_TYPES = [
    "DUPLICATE_TRANSACTION_ID",
    "DUPLICATE_REFERENCE",
    "REVERSAL_WITHOUT_ORIGINAL",
    "REVERSAL_AMOUNT_MISMATCH",
] as const;

export const DATA_QUALITY_SEVERITIES = [
    "LOW",
    "MEDIUM",
    "HIGH",
    "CRITICAL",
] as const;

export const DATA_QUALITY_STATUSES = [
    "OPEN",
    "RESOLVED",
] as const;

const dataQualityIssueSchema = new Schema(
    {
        uploadId: {
            type: Schema.Types.ObjectId,
            ref: "Upload",
            required: true,
            index: true,
        },

        sourceSystem: {
            type: String,
            required: true,
        },

        issueType: {
            type: String,
            enum: DATA_QUALITY_ISSUE_TYPES,
            required: true,
        },

        severity: {
            type: String,
            enum: DATA_QUALITY_SEVERITIES,
            required: true,
        },

        primaryTransactionId: {
            type: Schema.Types.ObjectId,
            ref: "Transaction",
            default: null,
        },

        relatedTransactionIds: [
            {
                type: Schema.Types.ObjectId,
                ref: "Transaction",
            },
        ],

        keyValue: {
            type: String,
            default: "",
        },

        description: {
            type: String,
            required: true,
            trim: true,
        },

        status: {
            type: String,
            enum: DATA_QUALITY_STATUSES,
            default: "OPEN",
        },

        fingerprint: {
            type: String,
            required: true,
            unique: true,
        },
    },
    {
        timestamps: true,
    }
);

dataQualityIssueSchema.index({
    issueType: 1,
    status: 1,
});

dataQualityIssueSchema.index({
    severity: 1,
    createdAt: -1,
});

export const DataQualityIssue =
    mongoose.model(
        "DataQualityIssue",
        dataQualityIssueSchema
    );