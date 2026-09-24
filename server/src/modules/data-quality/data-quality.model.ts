import mongoose, {
    Schema,
} from "mongoose";

/*
 * ----------------------------------------
 * ISSUE TYPES
 * ----------------------------------------
 */
export const DATA_QUALITY_ISSUE_TYPES = [
    "DUPLICATE_TRANSACTION_ID",
    "DUPLICATE_REFERENCE",
    "REVERSAL_WITHOUT_ORIGINAL",
    "REVERSAL_AMOUNT_MISMATCH",
] as const;

/*
 * ----------------------------------------
 * SEVERITY
 * ----------------------------------------
 */
export const DATA_QUALITY_SEVERITIES = [
    "LOW",
    "MEDIUM",
    "HIGH",
    "CRITICAL",
] as const;

/*
 * ----------------------------------------
 * DATA QUALITY WORKFLOW STATUS
 * ----------------------------------------
 *
 * OPEN
 * System detected the problem.
 *
 * UNDER_REVIEW
 * Investigation case has been created
 * and the issue is being investigated.
 *
 * CORRECTION_REQUIRED
 * Checker approved a remediation and
 * requested source-data correction.
 *
 * PENDING_VERIFICATION
 * Import Officer submitted corrected
 * data and BankSync must verify it.
 *
 * VERIFICATION_FAILED
 * BankSync rescanned the corrected data
 * but the problem still exists.
 *
 * VERIFIED_RESOLVED
 * BankSync automatically verified that
 * the original problem no longer exists.
 *
 * RESOLVED
 * Legacy status from the old workflow.
 * We keep it temporarily so existing
 * development/test records do not break.
 * New workflow must NOT set this status.
 */
export const DATA_QUALITY_STATUSES = [
    "OPEN",
    "UNDER_REVIEW",
    "CORRECTION_REQUIRED",
    "PENDING_VERIFICATION",
    "VERIFICATION_FAILED",
    "VERIFIED_RESOLVED",

    /*
     * Temporary backward compatibility.
     */
    "RESOLVED",
] as const;

const dataQualityIssueSchema =
    new Schema(
        {
            /*
             * ----------------------------------------
             * ORIGINAL UPLOAD
             * ----------------------------------------
             */
            uploadId: {
                type:
                    Schema.Types
                        .ObjectId,

                ref: "Upload",

                required: true,

                index: true,
            },

            sourceSystem: {
                type: String,
                required: true,
            },

            /*
             * ----------------------------------------
             * ISSUE INFORMATION
             * ----------------------------------------
             */
            issueType: {
                type: String,

                enum:
                    DATA_QUALITY_ISSUE_TYPES,

                required: true,
            },

            severity: {
                type: String,

                enum:
                    DATA_QUALITY_SEVERITIES,

                required: true,
            },

            primaryTransactionId: {
                type:
                    Schema.Types
                        .ObjectId,

                ref: "Transaction",

                default: null,
            },

            relatedTransactionIds: [
                {
                    type:
                        Schema.Types
                            .ObjectId,

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

            /*
             * ----------------------------------------
             * WORKFLOW STATUS
             * ----------------------------------------
             */
            status: {
                type: String,

                enum:
                    DATA_QUALITY_STATUSES,

                default: "OPEN",

                index: true,
            },

            /*
             * ----------------------------------------
             * LINKED INVESTIGATION CASE
             * ----------------------------------------
             *
             * Once Admin / Operations Manager
             * creates an investigation, the
             * Data Quality Issue will point to
             * that Case.
             */
            caseId: {
                type:
                    Schema.Types
                        .ObjectId,

                ref: "Case",

                default: null,

                index: true,
            },

            /*
             * ----------------------------------------
             * REVIEW INFORMATION
             * ----------------------------------------
             */
            reviewStartedBy: {
                type:
                    Schema.Types
                        .ObjectId,

                ref: "User",

                default: null,
            },

            reviewStartedAt: {
                type: Date,
                default: null,
            },

            /*
             * ----------------------------------------
             * VERIFICATION INFORMATION
             * ----------------------------------------
             *
             * This will later point to the
             * corrected upload submitted by
             * the Import Officer.
             */
            verificationUploadId: {
                type:
                    Schema.Types
                        .ObjectId,

                ref: "Upload",

                default: null,
            },

            verificationAttemptedAt: {
                type: Date,
                default: null,
            },

            verifiedResolvedAt: {
                type: Date,
                default: null,
            },

            /*
             * ----------------------------------------
             * ISSUE FINGERPRINT
             * ----------------------------------------
             *
             * Prevents the same detected problem
             * from generating duplicate issue
             * records every time a scan runs.
             */
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

/*
 * Search by issue type and workflow state.
 */
dataQualityIssueSchema.index({
    issueType: 1,
    status: 1,
});

/*
 * Risk-focused issue views.
 */
dataQualityIssueSchema.index({
    severity: 1,
    createdAt: -1,
});

/*
 * Investigation relationship.
 */
dataQualityIssueSchema.index({
    caseId: 1,
    status: 1,
});

/*
 * Original upload history.
 */
dataQualityIssueSchema.index({
    uploadId: 1,
    createdAt: -1,
});

export const DataQualityIssue =
    mongoose.model(
        "DataQualityIssue",
        dataQualityIssueSchema
    );