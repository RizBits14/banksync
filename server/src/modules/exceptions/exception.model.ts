import mongoose, { Schema } from "mongoose";

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

        status: {
            type: String,
            enum: ["OPEN", "ASSIGNED", "RESOLVED"],
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