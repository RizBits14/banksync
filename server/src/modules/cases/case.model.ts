import mongoose, {
    Schema,
} from "mongoose";

/*
 * ----------------------------------------
 * CASE ORIGIN
 * ----------------------------------------
 *
 * RECONCILIATION_EXCEPTION
 * Existing BankSync reconciliation case.
 *
 * DATA_QUALITY_ISSUE
 * Case created from a detected
 * Data Quality problem.
 */
export const CASE_ORIGIN_TYPES = [
    "RECONCILIATION_EXCEPTION",
    "DATA_QUALITY_ISSUE",
] as const;

export const CASE_STATUSES = [
    "OPEN",
    "ASSIGNED",
    "UNDER_INVESTIGATION",
    "PENDING_CHECKER_APPROVAL",
    "RETURNED_TO_MAKER",
    "APPROVED",
    "RESOLVED",
    "CLOSED",
] as const;

export const CASE_PRIORITIES = [
    "LOW",
    "MEDIUM",
    "HIGH",
    "CRITICAL",
] as const;

export const ROOT_CAUSE_CATEGORIES = [
    "MISSING_SOURCE_TRANSACTION",
    "MISSING_TARGET_TRANSACTION",
    "VALIDATION_FAILURE",
    "AMOUNT_DISCREPANCY",
    "STATUS_DISCREPANCY",
    "DUPLICATE_TRANSACTION",
    "TIMING_OR_CUTOFF_ISSUE",
    "REFERENCE_MISMATCH",
    "POSTING_ERROR",
    "SYSTEM_INTERFACE_ISSUE",
    "MANUAL_PROCESSING_ERROR",
    "FALSE_POSITIVE",
    "OTHER",
] as const;

export const PROPOSED_ACTIONS = [
    "ACCEPT_TRANSACTION",
    "CORRECT_SOURCE_RECORD",
    "CORRECT_TARGET_RECORD",
    "REPROCESS_TRANSACTION",
    "REVERSE_TRANSACTION",
    "MANUAL_ADJUSTMENT",
    "ESCALATE",
    "NO_ACTION_REQUIRED",
    "OTHER",
] as const;

export const CHECKER_RETURN_REASONS = [
    "EVIDENCE_OVERLOOKED",
    "INSUFFICIENT_EVIDENCE",
    "ROOT_CAUSE_UNCLEAR",
    "DATASET_REVIEW_INCOMPLETE",
    "TRANSACTION_COMPARISON_INCORRECT",
    "ACTION_NOT_SUPPORTED",
    "RESOLUTION_INCOMPLETE",
    "OTHER",
] as const;

/*
 * ----------------------------------------
 * MAKER INVESTIGATION CHECKLIST
 * ----------------------------------------
 */
const investigationChecklistSchema =
    new Schema(
        {
            sourceDatasetReviewed: {
                type: Boolean,
                default: false,
            },

            targetDatasetReviewed: {
                type: Boolean,
                default: false,
            },

            rejectedRowsReviewed: {
                type: Boolean,
                default: false,
            },

            accountChecked: {
                type: Boolean,
                default: false,
            },

            referenceChecked: {
                type: Boolean,
                default: false,
            },

            amountChecked: {
                type: Boolean,
                default: false,
            },

            transactionDateChecked: {
                type: Boolean,
                default: false,
            },

            duplicateSearchPerformed: {
                type: Boolean,
                default: false,
            },
        },
        {
            _id: false,
        }
    );

/*
 * ----------------------------------------
 * CHECKER REVIEW CHECKLIST
 * ----------------------------------------
 */
const checkerReviewSchema =
    new Schema(
        {
            sourceDatasetVerified: {
                type: Boolean,
                default: false,
            },

            targetDatasetVerified: {
                type: Boolean,
                default: false,
            },

            rejectedRowsVerified: {
                type: Boolean,
                default: false,
            },

            transactionIdentifiersCompared: {
                type: Boolean,
                default: false,
            },

            rootCauseSupported: {
                type: Boolean,
                default: false,
            },

            actionSupported: {
                type: Boolean,
                default: false,
            },

            resolutionAppropriate: {
                type: Boolean,
                default: false,
            },
        },
        {
            _id: false,
        }
    );

const caseSchema =
    new Schema(
        {
            /*
             * ----------------------------------------
             * CASE ORIGIN
             * ----------------------------------------
             *
             * Existing cases default to
             * RECONCILIATION_EXCEPTION so old
             * development records remain valid.
             */
            originType: {
                type: String,

                enum:
                    CASE_ORIGIN_TYPES,

                default:
                    "RECONCILIATION_EXCEPTION",

                required: true,

                index: true,
            },

            /*
             * ----------------------------------------
             * RECONCILIATION EXCEPTION ORIGIN
             * ----------------------------------------
             *
             * Required only when originType is
             * RECONCILIATION_EXCEPTION.
             */
            exceptionId: {
                type:
                    Schema.Types
                        .ObjectId,

                ref: "Exception",

                default: null,
            },

            /*
             * ----------------------------------------
             * DATA QUALITY ORIGIN
             * ----------------------------------------
             *
             * Required only when originType is
             * DATA_QUALITY_ISSUE.
             */
            dataQualityIssueId: {
                type:
                    Schema.Types
                        .ObjectId,

                ref:
                    "DataQualityIssue",

                default: null,
            },

            /*
             * Original source upload that produced
             * the Data Quality issue.
             *
             * This remains immutable evidence even
             * when a corrected upload is submitted.
             */
            originalUploadId: {
                type:
                    Schema.Types
                        .ObjectId,

                ref: "Upload",

                default: null,
            },

            /*
             * ----------------------------------------
             * ASSIGNMENT
             * ----------------------------------------
             */
            assignedTo: {
                type:
                    Schema.Types
                        .ObjectId,

                ref: "User",

                default: null,
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
             * ----------------------------------------
             * CASE STATUS
             * ----------------------------------------
             */
            status: {
                type: String,

                enum:
                    CASE_STATUSES,

                default: "OPEN",
            },

            priority: {
                type: String,

                enum:
                    CASE_PRIORITIES,

                required: true,
            },

            /*
             * ----------------------------------------
             * MAKER INVESTIGATION
             * ----------------------------------------
             */
            investigationChecklist: {
                type:
                    investigationChecklistSchema,

                default: () => ({}),
            },

            rootCauseCategory: {
                type: String,

                enum:
                    ROOT_CAUSE_CATEGORIES,

                default: null,
            },

            rootCauseDetails: {
                type: String,
                trim: true,
                default: "",
            },

            investigationNotes: {
                type: String,
                trim: true,
                default: "",
            },

            evidenceSummary: {
                type: String,
                trim: true,
                default: "",
            },

            proposedAction: {
                type: String,

                enum:
                    PROPOSED_ACTIONS,

                default: null,
            },

            proposedResolution: {
                type: String,
                trim: true,
                default: "",
            },

            investigationStartedAt: {
                type: Date,
                default: null,
            },

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
             * CHECKER REVIEW
             * ----------------------------------------
             */
            checkerReview: {
                type:
                    checkerReviewSchema,

                default: () => ({}),
            },

            checkerReturnReason: {
                type: String,

                enum:
                    CHECKER_RETURN_REASONS,

                default: null,
            },

            checkerComment: {
                type: String,
                trim: true,
                default: "",
            },

            checkedBy: {
                type:
                    Schema.Types
                        .ObjectId,

                ref: "User",

                default: null,
            },

            checkedAt: {
                type: Date,
                default: null,
            },

            /*
             * ----------------------------------------
             * FINAL RESOLUTION
             * ----------------------------------------
             *
             * Existing reconciliation cases still
             * use this.
             *
             * Later we will prevent Data Quality
             * cases from reaching RESOLVED until
             * automated correction verification
             * succeeds.
             */
            resolutionExecutionNote: {
                type: String,
                trim: true,
                default: "",
            },

            resolvedBy: {
                type:
                    Schema.Types
                        .ObjectId,

                ref: "User",

                default: null,
            },

            resolvedAt: {
                type: Date,
                default: null,
            },

            /*
             * ----------------------------------------
             * FINAL CASE CLOSURE
             * ----------------------------------------
             */
            closureNote: {
                type: String,
                trim: true,
                default: "",
            },

            closedBy: {
                type:
                    Schema.Types
                        .ObjectId,

                ref: "User",

                default: null,
            },

            closedAt: {
                type: Date,
                default: null,
            },
        },
        {
            timestamps: true,

            optimisticConcurrency:
                true,
        }
    );

/*
 * ----------------------------------------
 * ORIGIN VALIDATION
 * ----------------------------------------
 *
 * Exactly the appropriate source must
 * exist for each Case type.
 */
caseSchema.pre(
    "validate",
    function () {
        if (
            this.originType ===
            "RECONCILIATION_EXCEPTION"
        ) {
            if (
                !this.exceptionId
            ) {
                this.invalidate(
                    "exceptionId",
                    "Reconciliation cases require an exception"
                );
            }

            if (
                this.dataQualityIssueId
            ) {
                this.invalidate(
                    "dataQualityIssueId",
                    "Reconciliation cases cannot reference a Data Quality issue"
                );
            }
        }

        if (
            this.originType ===
            "DATA_QUALITY_ISSUE"
        ) {
            if (
                !this.dataQualityIssueId
            ) {
                this.invalidate(
                    "dataQualityIssueId",
                    "Data Quality cases require a Data Quality issue"
                );
            }

            if (
                !this.originalUploadId
            ) {
                this.invalidate(
                    "originalUploadId",
                    "Data Quality cases require the original upload"
                );
            }

            if (
                this.exceptionId
            ) {
                this.invalidate(
                    "exceptionId",
                    "Data Quality cases cannot reference a reconciliation exception"
                );
            }
        }
    }
);

/*
 * ----------------------------------------
 * UNIQUE ORIGIN REFERENCES
 * ----------------------------------------
 *
 * One Exception can create only one Case.
 */
caseSchema.index(
    {
        exceptionId: 1,
    },
    {
        unique: true,

        partialFilterExpression: {
            exceptionId: {
                $type:
                    "objectId",
            },
        },
    }
);

/*
 * One Data Quality issue can create
 * only one Case.
 */
caseSchema.index(
    {
        dataQualityIssueId: 1,
    },
    {
        unique: true,

        partialFilterExpression: {
            dataQualityIssueId: {
                $type:
                    "objectId",
            },
        },
    }
);

/*
 * Useful operational views.
 */
caseSchema.index({
    originType: 1,
    status: 1,
    createdAt: -1,
});

caseSchema.index({
    originalUploadId: 1,
    createdAt: -1,
});

export const Case =
    mongoose.model(
        "Case",
        caseSchema
    );