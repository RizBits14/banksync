import mongoose, { Schema } from "mongoose";

const severityBreakdownSchema = new Schema(
    {
        label: {
            type: String,
            required: true,
            trim: true,
        },

        score: {
            type: Number,
            required: true,
            min: 0,
        },

        maxScore: {
            type: Number,
            required: true,
            min: 0,
        },

        explanation: {
            type: String,
            required: true,
            trim: true,
        },
    },
    {
        _id: false,
    }
);

const exceptionSchema = new Schema(
    {
        reconciliationId: {
            type: Schema.Types.ObjectId,
            ref: "Reconciliation",
            required: true,
        },

        reconciliationResultId: {
            type: Schema.Types.ObjectId,
            ref: "ReconciliationResult",
            required: true,
            unique: true,
        },

        transactionId: {
            type: Schema.Types.ObjectId,
            ref: "Transaction",
            required: true,
        },

        exceptionType: {
            type: String,
            enum: [
                "UNMATCHED",
                "AMOUNT_MISMATCH",
                "STATUS_MISMATCH",
                "AMOUNT_AND_STATUS_MISMATCH",
                "PROBABLE_MATCH",
            ],
            required: true,
        },

        score: {
            type: Number,
            min: 0,
            max: 100,
            required: true,
        },

        reasons: {
            type: [String],
            default: [],
        },

        breakdown: {
            type: [severityBreakdownSchema],
            default: [],
        },

        status: {
            type: String,
            enum: [
                "OPEN",
                "ASSIGNED",
                "RESOLVED",
            ],
            default: "OPEN",
        },
    },
    {
        timestamps: true,
    }
);

export const Exception = mongoose.model(
    "Exception",
    exceptionSchema
);