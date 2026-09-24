import { z } from "zod";

import {
    CHECKER_RETURN_REASONS,
} from "./case.model.js";

/*
 * ----------------------------------------
 * SHARED CHECKER REVIEW SHAPE
 * ----------------------------------------
 *
 * BankSync uses one Case model for:
 *
 * - RECONCILIATION_EXCEPTION
 * - DATA_QUALITY_ISSUE
 *
 * The same stored checkerReview object is
 * reused for both origins.
 *
 * IMPORTANT:
 *
 * targetDatasetVerified remains in the
 * payload because reconciliation cases
 * require it.
 *
 * For Data Quality cases the frontend sends
 * it as false and the controller deliberately
 * does NOT require it for approval.
 */
const checkerReviewSchema = z.object({
    sourceDatasetVerified:
        z.boolean(),

    targetDatasetVerified:
        z.boolean(),

    rejectedRowsVerified:
        z.boolean(),

    transactionIdentifiersCompared:
        z.boolean(),

    rootCauseSupported:
        z.boolean(),

    actionSupported:
        z.boolean(),

    resolutionAppropriate:
        z.boolean(),
});

export const approveCaseSchema =
    z.object({
        checkerReview:
            checkerReviewSchema,

        checkerComment: z
            .string()
            .trim()
            .max(
                1000,
                "Checker comment cannot exceed 1000 characters"
            )
            .optional(),
    });

export const returnCaseSchema =
    z.object({
        checkerReview:
            checkerReviewSchema,

        checkerReturnReason:
            z.enum(
                CHECKER_RETURN_REASONS
            ),

        checkerComment: z
            .string()
            .trim()
            .min(
                3,
                "Checker comment is required when returning a case"
            )
            .max(
                1000,
                "Checker comment cannot exceed 1000 characters"
            ),
    });
