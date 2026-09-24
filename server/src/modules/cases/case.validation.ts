import { z } from "zod";

/*
 * ----------------------------------------
 * ROOT CAUSE
 * ----------------------------------------
 */
const rootCauseCategorySchema =
    z.enum([
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
    ]);

/*
 * ----------------------------------------
 * PROPOSED ACTION
 * ----------------------------------------
 */
const proposedActionSchema =
    z.enum([
        "ACCEPT_TRANSACTION",
        "CORRECT_SOURCE_RECORD",
        "CORRECT_TARGET_RECORD",
        "REPROCESS_TRANSACTION",
        "REVERSE_TRANSACTION",
        "MANUAL_ADJUSTMENT",
        "ESCALATE",
        "NO_ACTION_REQUIRED",
        "OTHER",
    ]);

/*
 * ----------------------------------------
 * CASE PRIORITY
 * ----------------------------------------
 */
const casePrioritySchema =
    z.enum([
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL",
    ]);

/*
 * ----------------------------------------
 * MAKER INVESTIGATION CHECKLIST
 * ----------------------------------------
 */
const investigationChecklistSchema =
    z
        .object({
            sourceDatasetReviewed:
                z.boolean().optional(),

            targetDatasetReviewed:
                z.boolean().optional(),

            rejectedRowsReviewed:
                z.boolean().optional(),

            accountChecked:
                z.boolean().optional(),

            referenceChecked:
                z.boolean().optional(),

            amountChecked:
                z.boolean().optional(),

            transactionDateChecked:
                z.boolean().optional(),

            duplicateSearchPerformed:
                z.boolean().optional(),
        })
        .refine(
            (data) =>
                Object.keys(data).length > 0,
            {
                message:
                    "At least one checklist item is required",
            }
        );

/*
 * ----------------------------------------
 * ASSIGN EXISTING CASE
 * ----------------------------------------
 */
export const assignCaseSchema =
    z.object({
        makerId: z
            .string()
            .min(
                1,
                "Maker ID is required"
            ),
    });

/*
 * ----------------------------------------
 * CREATE DATA QUALITY INVESTIGATION
 * ----------------------------------------
 *
 * Admin / Operations Manager selects:
 *
 * - Maker
 * - Priority
 *
 * The Data Quality issue ID itself comes
 * from the URL, not from the request body.
 *
 * Example:
 *
 * POST
 * /data-quality/issues/:id/investigation
 *
 * body:
 * {
 *   makerId: "...",
 *   priority: "HIGH"
 * }
 */
export const createDataQualityInvestigationSchema =
    z.object({
        makerId: z
            .string()
            .min(
                1,
                "Maker ID is required"
            ),

        priority:
            casePrioritySchema,
    });

/*
 * ----------------------------------------
 * UPDATE MAKER INVESTIGATION
 * ----------------------------------------
 */
export const updateInvestigationSchema =
    z
        .object({
            investigationChecklist:
                investigationChecklistSchema.optional(),

            rootCauseCategory:
                rootCauseCategorySchema
                    .nullable()
                    .optional(),

            rootCauseDetails: z
                .string()
                .trim()
                .max(
                    3000,
                    "Root cause details cannot exceed 3000 characters"
                )
                .optional(),

            investigationNotes: z
                .string()
                .trim()
                .max(
                    5000,
                    "Investigation notes cannot exceed 5000 characters"
                )
                .optional(),

            evidenceSummary: z
                .string()
                .trim()
                .max(
                    3000,
                    "Evidence summary cannot exceed 3000 characters"
                )
                .optional(),

            proposedAction:
                proposedActionSchema
                    .nullable()
                    .optional(),

            proposedResolution: z
                .string()
                .trim()
                .max(
                    3000,
                    "Proposed resolution cannot exceed 3000 characters"
                )
                .optional(),
        })
        .refine(
            (data) =>
                data.investigationChecklist !==
                    undefined ||
                data.rootCauseCategory !==
                    undefined ||
                data.rootCauseDetails !==
                    undefined ||
                data.investigationNotes !==
                    undefined ||
                data.evidenceSummary !==
                    undefined ||
                data.proposedAction !==
                    undefined ||
                data.proposedResolution !==
                    undefined,
            {
                message:
                    "At least one investigation field is required",
            }
        );