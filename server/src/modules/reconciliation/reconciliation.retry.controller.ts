import mongoose from "mongoose";
import type {
    Request,
    Response,
} from "express";

import {
    Upload,
} from "../uploads/upload.model.js";

import {
    DataCorrectionTask,
} from "../data-corrections/data-correction.model.js";

import {
    DataQualityIssue,
} from "../data-quality/data-quality.model.js";

import {
    Exception,
} from "../exceptions/exception.model.js";

import {
    generateExceptions,
} from "../exceptions/exception.service.js";

import {
    Reconciliation,
} from "./reconciliation.model.js";

import {
    ReconciliationResult,
} from "./reconciliation-result.model.js";

import {
    runExactMatching,
} from "./reconciliation.service.js";

import {
    getReconciliationProfile,
} from "./reconciliation-profile.config.js";


const RECONCILIATION_READY_UPLOAD_STATUSES = [
    "VALIDATED",
    "PARTIALLY_VALIDATED",
    "COMPLETED",
] as const;


/*
 * ----------------------------------------
 * RECONCILIATION ELIGIBILITY
 * ----------------------------------------
 *
 * Retry must use the SAME upload controls as
 * a brand-new reconciliation.
 *
 * This prevents a failed reconciliation from
 * bypassing:
 *
 * - archived upload protection
 * - validation readiness
 * - Data Quality correction workflow
 * - superseded original uploads
 * - superseded correction attempts
 * - unresolved Data Quality issues
 */
const getUploadReconciliationBlockReason =
    async (
        upload: any
    ): Promise<string | null> => {
        if (upload.isArchived) {
            return "Upload is archived";
        }

        if (
            !RECONCILIATION_READY_UPLOAD_STATUSES.includes(
                upload.status
            )
        ) {
            return "Upload is not in a reconciliation-ready validation status";
        }

        /*
         * This upload is itself a correction attempt.
         */
        if (upload.correctionTaskId) {
            const task =
                await DataCorrectionTask
                    .findById(
                        upload.correctionTaskId
                    )
                    .select(
                        "status correctedUploadId originalUploadId"
                    )
                    .lean() as any;

            if (!task) {
                return "Corrected upload is not connected to a valid correction task";
            }

            if (
                task.status !==
                "VERIFIED_RESOLVED"
            ) {
                return "Corrected upload has not passed the full BankSync verification workflow";
            }

            if (
                !task.correctedUploadId ||
                task.correctedUploadId
                    .toString() !==
                upload._id.toString()
            ) {
                return "This is an older correction attempt and has been superseded by another corrected upload";
            }
        } else {
            /*
             * If this is the ORIGINAL upload of a
             * correction workflow, it is historical
             * evidence only and cannot be reused.
             */
            const correctionTask =
                await DataCorrectionTask
                    .findOne({
                        originalUploadId:
                            upload._id,
                    })
                    .select(
                        "_id status correctedUploadId"
                    )
                    .lean();

            if (correctionTask) {
                return "Original upload has been superseded by the Data Quality correction workflow and is retained for audit only";
            }
        }

        /*
         * Any unresolved Data Quality issue on the
         * exact upload blocks retry.
         */
        const unresolvedIssue =
            await DataQualityIssue
                .findOne({
                    uploadId:
                        upload._id,

                    status: {
                        $nin: [
                            "VERIFIED_RESOLVED",
                            "RESOLVED",
                        ],
                    },
                })
                .select(
                    "_id issueType status keyValue"
                )
                .lean() as any;

        if (unresolvedIssue) {
            return `Upload has unresolved Data Quality issue ${unresolvedIssue.issueType}${
                unresolvedIssue.keyValue
                    ? ` (${unresolvedIssue.keyValue})`
                    : ""
            }`;
        }

        return null;
    };


export const retryReconciliation = async (
    req: Request,
    res: Response
) => {
    let claimedReconciliationId:
        mongoose.Types.ObjectId | null =
        null;

    try {
        const {
            id,
        } = req.params;

        if (
            typeof id !== "string" ||
            !mongoose.isValidObjectId(
                id
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid reconciliation ID",
            });
        }

        const existing =
            await Reconciliation.findById(
                id
            );

        if (!existing) {
            return res.status(404).json({
                success: false,
                message:
                    "Reconciliation not found",
            });
        }

        /*
         * Only the original Import Officer or an
         * Admin may retry the failed run.
         */
        if (
            res.locals.user.role !==
                "ADMIN" &&
            existing.startedBy.toString() !==
                res.locals.user.userId
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "Only the original Import Officer or an Admin can retry this reconciliation",
            });
        }

        if (
            existing.status !==
            "FAILED"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Only failed reconciliations can be retried",
            });
        }

        if (
            existing.sourceUploadId.equals(
                existing.targetUploadId
            )
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Source and target uploads must be different",
            });
        }

        /*
         * ----------------------------------------
         * PROFILE REQUIRED FOR RETRY
         * ----------------------------------------
         *
         * Old reconciliation records created before
         * pairing profiles existed may have:
         *
         * profileKey = null
         *
         * Those runs are preserved as historical
         * records, but they cannot be retried because
         * retrying them would bypass the new BankSync
         * business pairing control.
         *
         * The user should create a NEW reconciliation
         * under an approved profile instead.
         */
        if (
            !existing.profileKey
        ) {
            return res.status(409).json({
                success: false,

                code:
                    "LEGACY_RECONCILIATION_PROFILE_REQUIRED",

                message:
                    "This is a legacy reconciliation created before BankSync pairing profiles were introduced. Create a new reconciliation under an approved profile instead of retrying this run.",
            });
        }

        const profile =
            getReconciliationProfile(
                existing.profileKey
            );

        if (!profile) {
            return res.status(409).json({
                success: false,

                code:
                    "RECONCILIATION_PROFILE_UNAVAILABLE",

                message:
                    "The reconciliation profile used by this run is no longer available. Review the run and create a new reconciliation under a valid profile.",
            });
        }

        const [
            sourceUpload,
            targetUpload,
        ] = await Promise.all([
            Upload.findById(
                existing.sourceUploadId
            ),

            Upload.findById(
                existing.targetUploadId
            ),
        ]);

        if (
            !sourceUpload ||
            !targetUpload
        ) {
            return res.status(404).json({
                success: false,
                message:
                    "Upload not found",
            });
        }

        /*
         * ----------------------------------------
         * PAIRING RULE RE-CHECK
         * ----------------------------------------
         *
         * A retry must STILL satisfy the profile:
         *
         * profile = ATM_TO_CBS
         * source  = ATM
         * target  = CBS
         *
         * This protects against manual API calls,
         * damaged historical data, or later changes
         * to upload references.
         */
        const sourceMatchesProfile =
            sourceUpload.sourceSystem ===
            profile.sourceSystem;

        const targetMatchesProfile =
            targetUpload.sourceSystem ===
            profile.targetSystem;

        if (
            !sourceMatchesProfile ||
            !targetMatchesProfile
        ) {
            return res.status(409).json({
                success: false,

                code:
                    "INVALID_RECONCILIATION_PAIR",

                message:
                    `Retry blocked because the stored uploads no longer satisfy the "${profile.name}" profile. ` +
                    `Required pair: ${profile.sourceSystem} -> ${profile.targetSystem}. ` +
                    `Stored pair: ${sourceUpload.sourceSystem} -> ${targetUpload.sourceSystem}.`,

                data: {
                    profile: {
                        key:
                            profile.key,

                        name:
                            profile.name,

                        requiredSourceSystem:
                            profile.sourceSystem,

                        requiredTargetSystem:
                            profile.targetSystem,

                        businessReason:
                            profile.businessReason,
                    },

                    selectedPair: {
                        sourceSystem:
                            sourceUpload.sourceSystem,

                        targetSystem:
                            targetUpload.sourceSystem,
                    },
                },
            });
        }

        /*
         * ----------------------------------------
         * RE-CHECK UPLOAD ELIGIBILITY
         * ----------------------------------------
         *
         * A file that was valid when the failed run
         * was created may later become archived,
         * superseded, enter a correction workflow,
         * or gain a Data Quality issue.
         *
         * Retry must therefore re-check BOTH uploads.
         */
        const [
            sourceBlockReason,
            targetBlockReason,
        ] = await Promise.all([
            getUploadReconciliationBlockReason(
                sourceUpload
            ),

            getUploadReconciliationBlockReason(
                targetUpload
            ),
        ]);

        if (sourceBlockReason) {
            return res.status(409).json({
                success: false,
                message:
                    `Source upload is no longer eligible for reconciliation: ${sourceBlockReason}`,
            });
        }

        if (targetBlockReason) {
            return res.status(409).json({
                success: false,
                message:
                    `Target upload is no longer eligible for reconciliation: ${targetBlockReason}`,
            });
        }

        /*
         * ----------------------------------------
         * RESULT CHECKPOINT SAFETY
         * ----------------------------------------
         */
        if (
            existing.matchingCompletedAt
        ) {
            const savedResultCount =
                await ReconciliationResult
                    .countDocuments({
                        reconciliationId:
                            existing._id,
                    });

            if (
                savedResultCount !==
                existing.totalTransactions
            ) {
                return res.status(409).json({
                    success: false,
                    message:
                        "Saved matching results are incomplete. Review this reconciliation before retrying",
                });
            }
        } else {
            /*
             * Older/uncheckpointed failed runs may
             * already have exceptions referencing
             * result IDs. Those records must not be
             * silently destroyed.
             */
            const existingException =
                await Exception.exists({
                    reconciliationId:
                        existing._id,
                });

            if (
                existingException
            ) {
                return res.status(409).json({
                    success: false,
                    message:
                        "This reconciliation has exceptions but no matching checkpoint. Review it before retrying",
                });
            }
        }

        /*
         * ----------------------------------------
         * ATOMIC RETRY CLAIM
         * ----------------------------------------
         *
         * Only one request may change FAILED to
         * PROCESSING using this version of the run.
         */
        const reconciliation =
            await Reconciliation
                .findOneAndUpdate(
                    {
                        _id:
                            existing._id,

                        status:
                            "FAILED",

                        updatedAt:
                            existing.updatedAt,
                    },
                    {
                        $set: {
                            status:
                                "PROCESSING",
                        },
                    },
                    {
                        returnDocument:
                            "after",

                        runValidators:
                            true,
                    }
                );

        if (
            !reconciliation
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "The reconciliation has changed or another retry has started",
            });
        }

        /*
         * Only the request that successfully
         * acquired this run may process it or mark
         * it failed.
         */
        claimedReconciliationId =
            reconciliation._id;

        if (
            !reconciliation
                .matchingCompletedAt
        ) {
            /*
             * No exceptions reference these
             * uncheckpointed result records.
             */
            await ReconciliationResult
                .deleteMany({
                    reconciliationId:
                        reconciliation._id,
                });

            const result =
                await runExactMatching(
                    reconciliation._id,

                    reconciliation
                        .sourceUploadId
                        .toString(),

                    reconciliation
                        .targetUploadId
                        .toString()
                );

            reconciliation
                .totalTransactions =
                result.totalTransactions;

            reconciliation
                .matchedCount =
                result.matchedCount;

            reconciliation
                .probableMatchCount =
                result.probableMatchCount;

            reconciliation
                .unmatchedCount =
                result.unmatchedCount;

            reconciliation
                .mismatchCount =
                result.mismatchCount;

            reconciliation
                .matchingCompletedAt =
                new Date();

            await reconciliation.save();
        }

        await generateExceptions(
            reconciliation
                ._id
                .toString()
        );

        reconciliation.status =
            "COMPLETED";

        await reconciliation.save();

        return res.status(200).json({
            success: true,
            message:
                "Reconciliation retried successfully",
            data:
                reconciliation,
        });
    } catch (error) {
        console.error(
            "Retry reconciliation error:",
            error
        );

        if (
            claimedReconciliationId
        ) {
            try {
                await Reconciliation
                    .updateOne(
                        {
                            _id:
                                claimedReconciliationId,

                            status:
                                "PROCESSING",
                        },
                        {
                            $set: {
                                status:
                                    "FAILED",
                            },
                        }
                    );
            } catch (statusError) {
                console.error(
                    "Unable to mark reconciliation retry as failed:",
                    statusError
                );
            }
        }

        return res.status(500).json({
            success: false,
            message:
                "Unable to retry reconciliation",
        });
    }
};
