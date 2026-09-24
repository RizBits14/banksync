import mongoose, {
    Schema,
} from "mongoose";

/*
 * ----------------------------------------
 * DATA CORRECTION TASK STATUS
 * ----------------------------------------
 *
 * This task exists only for a Data Quality
 * Case where actual source-data remediation
 * is required.
 *
 * The Case itself remains APPROVED while
 * correction + verification are happening.
 */
export const DATA_CORRECTION_STATUSES = [
    "REQUESTED",
    "ASSIGNED",
    "IN_PROGRESS",
    "CORRECTED_UPLOAD_SUBMITTED",
    "VERIFICATION_FAILED",
    "VERIFIED_RESOLVED",
    "CANCELLED",
] as const;

export type DataCorrectionStatus =
    (typeof DATA_CORRECTION_STATUSES)[number];

const dataCorrectionTaskSchema =
    new Schema(
        {
            /*
             * ----------------------------------------
             * CONNECTED BANKSYNC WORKFLOW
             * ----------------------------------------
             */

            caseId: {
                type:
                    Schema.Types
                        .ObjectId,

                ref: "Case",

                required: true,
            },

            dataQualityIssueId: {
                type:
                    Schema.Types
                        .ObjectId,

                ref:
                    "DataQualityIssue",

                required: true,
            },

            /*
             * Immutable original banking upload
             * that triggered the investigation.
             */
            originalUploadId: {
                type:
                    Schema.Types
                        .ObjectId,

                ref: "Upload",

                required: true,

                index: true,
            },

            /*
             * Later this points to the corrected
             * version uploaded by Import Officer.
             *
             * Original upload is never replaced.
             */
            correctedUploadId: {
                type:
                    Schema.Types
                        .ObjectId,

                ref: "Upload",

                default: null,
            },

            /*
             * ----------------------------------------
             * CHECKER HANDOFF
             * ----------------------------------------
             *
             * Maker recommendation stays preserved
             * on the Case.
             *
             * Checker instruction is stored
             * separately so Checker never silently
             * overwrites Maker's original work.
             */
            requestedBy: {
                type:
                    Schema.Types
                        .ObjectId,

                ref: "User",

                required: true,
            },

            requestedAt: {
                type: Date,

                required: true,

                default: Date.now,
            },

            checkerInstruction: {
                type: String,

                required: true,

                trim: true,

                maxlength: 5000,
            },

            /*
             * ----------------------------------------
             * IMPORT OFFICER ASSIGNMENT
             * ----------------------------------------
             */
            assignedTo: {
                type:
                    Schema.Types
                        .ObjectId,

                ref: "User",

                default: null,

                index: true,
            },

            assignedBy: {
                type:
                    Schema.Types
                        .ObjectId,

                ref: "User",

                default: null,
            },

            assignedAt: {
                type: Date,

                default: null,
            },

            /*
             * Import Officer's operational note.
             *
             * This describes what was corrected
             * externally in the source extract.
             */
            importOfficerNote: {
                type: String,

                trim: true,

                maxlength: 5000,

                default: "",
            },

            startedAt: {
                type: Date,

                default: null,
            },

            /*
             * ----------------------------------------
             * CORRECTED UPLOAD SUBMISSION
             * ----------------------------------------
             */
            submittedBy: {
                type:
                    Schema.Types
                        .ObjectId,

                ref: "User",

                default: null,
            },

            submittedAt: {
                type: Date,

                default: null,
            },

            /*
             * ----------------------------------------
             * AUTOMATED VERIFICATION
             * ----------------------------------------
             */
            verificationAttemptedAt: {
                type: Date,

                default: null,
            },

            verificationFailureReason: {
                type: String,

                trim: true,

                maxlength: 3000,

                default: "",
            },

            verifiedAt: {
                type: Date,

                default: null,
            },

            /*
             * ----------------------------------------
             * TASK STATE
             * ----------------------------------------
             */
            status: {
                type: String,

                enum:
                    DATA_CORRECTION_STATUSES,

                required: true,

                default:
                    "REQUESTED",

                index: true,
            },
        },
        {
            timestamps: true,

            optimisticConcurrency:
                true,
        }
    );

/*
 * One Data Quality issue should have one
 * correction workflow.
 *
 * Verification failure stays inside the
 * same task and returns to Import Officer
 * instead of creating disconnected tasks.
 *
 * IMPORTANT:
 * caseId and dataQualityIssueId are indexed
 * here only. They intentionally do NOT also
 * use "index: true" in their field definitions,
 * which avoids Mongoose duplicate-index warnings.
 */
dataCorrectionTaskSchema.index(
    {
        dataQualityIssueId:
            1,
    },
    {
        unique: true,
    }
);

dataCorrectionTaskSchema.index(
    {
        caseId: 1,
    },
    {
        unique: true,
    }
);

dataCorrectionTaskSchema.index({
    assignedTo: 1,
    status: 1,
    createdAt: -1,
});

dataCorrectionTaskSchema.index({
    status: 1,
    createdAt: -1,
});

export const DataCorrectionTask =
    mongoose.models
        .DataCorrectionTask ||
    mongoose.model(
        "DataCorrectionTask",
        dataCorrectionTaskSchema
    );
