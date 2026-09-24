import mongoose, {
    Schema,
} from "mongoose";

import {
    RECONCILIATION_PROFILE_KEYS,
} from "./reconciliation-profile.config.js";

const reconciliationSchema =
    new Schema(
        {
            /*
             * ----------------------------------------
             * RECONCILIATION PROFILE
             * ----------------------------------------
             *
             * This identifies the bank-approved
             * business control used for this run.
             *
             * Example:
             * ATM_TO_CBS
             *
             * Historical reconciliation records
             * created before profiles existed may
             * still have null here, so the field is
             * intentionally backward-compatible.
             */
            profileKey: {
                type: String,

                enum: [
                    ...RECONCILIATION_PROFILE_KEYS,
                    null,
                ],

                default: null,

                index: true,
            },

            /*
             * Snapshot the profile explanation used
             * when the reconciliation was created.
             *
             * This preserves the audit meaning even
             * if profile wording changes later.
             */
            profileName: {
                type: String,
                default: "",
                trim: true,
            },

            businessReason: {
                type: String,
                default: "",
                trim: true,
            },

            sourceUploadId: {
                type:
                    Schema.Types
                        .ObjectId,

                ref: "Upload",

                required: true,
            },

            targetUploadId: {
                type:
                    Schema.Types
                        .ObjectId,

                ref: "Upload",

                required: true,
            },

            startedBy: {
                type:
                    Schema.Types
                        .ObjectId,

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

            matchingCompletedAt: {
                type: Date,
                default: null,
            },

            totalTransactions: {
                type: Number,
                default: 0,
            },

            matchedCount: {
                type: Number,
                default: 0,
            },

            probableMatchCount: {
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

reconciliationSchema.index({
    profileKey: 1,
    createdAt: -1,
});

export const Reconciliation =
    mongoose.model(
        "Reconciliation",
        reconciliationSchema
    );
