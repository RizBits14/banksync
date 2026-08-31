import mongoose, { Schema } from "mongoose";

const reconciliationResultSchema = new Schema(
    {
        reconciliationId: {
            type: Schema.Types.ObjectId,
            ref: "Reconciliation",
            required: true,
        },

        sourceTransactionId: {
            type: Schema.Types.ObjectId,
            ref: "Transaction",
            required: true,
        },

        targetTransactionId: {
            type: Schema.Types.ObjectId,
            ref: "Transaction",
            default: null,
        },

        result: {
            type: String,
            enum: [
                "MATCHED",
                "UNMATCHED",
                "AMOUNT_MISMATCH",
                "STATUS_MISMATCH",
                "AMOUNT_AND_STATUS_MISMATCH",
            ],
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

export const ReconciliationResult = mongoose.model(
    "ReconciliationResult",
    reconciliationResultSchema
);