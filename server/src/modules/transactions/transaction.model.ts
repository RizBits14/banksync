import mongoose, { Schema } from "mongoose";

const transactionSchema = new Schema(
    {
        uploadId: {
            type: Schema.Types.ObjectId,
            ref: "Upload",
            required: true,
        },

        sourceSystem: {
            type: String,
            required: true,
        },

        transactionId: {
            type: String,
            required: true,
            trim: true,
        },

        referenceNumber: {
            type: String,
            trim: true,
        },

        accountNumber: {
            type: String,
            trim: true,
        },

        amount: {
            type: Schema.Types.Decimal128,
            required: true,
        },

        transactionDate: {
            type: Date,
            required: true,
        },

        status: {
            type: String,
            enum: ["SUCCESS", "FAILED", "PENDING", "REVERSED"],
            required: true,
        },

        rawRecord: {
            type: Schema.Types.Mixed,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

export const Transaction = mongoose.model(
    "Transaction",
    transactionSchema
);