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
            default: null,
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
                "PROBABLE_MATCH",
                "UNMATCHED",
                "AMOUNT_MISMATCH",
                "STATUS_MISMATCH",
                "AMOUNT_AND_STATUS_MISMATCH",
            ],
            required: true,
        },

        matchScore: {
            type: Number,
            min: 0,
            max: 100,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

reconciliationResultSchema.pre("validate", function () {
    const hasSource = Boolean(this.sourceTransactionId);
    const hasTarget = Boolean(this.targetTransactionId);

    if (this.result === "UNMATCHED") {
        if (hasSource === hasTarget) {
            this.invalidate(
                "sourceTransactionId",
                "An unmatched result must reference exactly one transaction"
            );
        }

        return;
    }

    if (!hasSource) {
        this.invalidate(
            "sourceTransactionId",
            "A paired result requires a source transaction"
        );
    }

    if (!hasTarget) {
        this.invalidate(
            "targetTransactionId",
            "A paired result requires a target transaction"
        );
    }
});

export const ReconciliationResult = mongoose.model(
    "ReconciliationResult",
    reconciliationResultSchema
);