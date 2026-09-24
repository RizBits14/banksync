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
    Reconciliation,
} from "./reconciliation.model.js";

import {
    ReconciliationResult,
} from "./reconciliation-result.model.js";

import {
    runExactMatching,
} from "./reconciliation.service.js";

import {
    generateExceptions,
} from "../exceptions/exception.service.js";

import {
    RECONCILIATION_PROFILES,
    getReconciliationProfile,
} from "./reconciliation-profile.config.js";


const RECONCILIATION_READY_UPLOAD_STATUSES = [
    "VALIDATED",
    "PARTIALLY_VALIDATED",
    "COMPLETED",
] as const;


/*
 * ----------------------------------------
 * RECONCILIATION PROFILES
 * ----------------------------------------
 *
 * The frontend uses this endpoint to show
 * the bank-approved reconciliation choices.
 *
 * Example:
 *
 * ATM -> CBS
 * CBS -> GENERAL_LEDGER
 *
 * Each profile explains WHY the two systems
 * are valid business counterparts.
 */
export const getReconciliationProfiles =
    async (
        _req: Request,
        res: Response
    ) => {
        return res.status(200).json({
            success: true,
            data: RECONCILIATION_PROFILES,
        });
    };


/*
 * ----------------------------------------
 * RECONCILIATION ELIGIBILITY
 * ----------------------------------------
 *
 * Ordinary upload:
 * - active
 * - validated / partially validated / completed
 * - no unresolved Data Quality issue
 *
 * Corrected upload:
 * - must be the CURRENT correctedUploadId on
 *   its DataCorrectionTask
 * - task must be VERIFIED_RESOLVED
 * - no unresolved DQ issue on the corrected file
 *
 * Original upload with a correction task:
 * - preserved for audit
 * - NEVER eligible for a new reconciliation
 *
 * Older correction attempt:
 * - preserved for audit
 * - NEVER eligible for a new reconciliation
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
             * If this upload is the ORIGINAL upload
             * of a correction workflow, it is now
             * historical audit evidence only.
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
         * Any unresolved DQ issue on the exact
         * selected upload blocks reconciliation.
         *
         * This also prevents a corrected upload
         * from becoming reconciliation-ready if
         * the re-scan introduced or discovered a
         * different unresolved integrity problem.
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


/*
 * ----------------------------------------
 * CREATE RECONCILIATION
 * ----------------------------------------
 *
 * A new reconciliation now requires:
 *
 * 1. a valid Reconciliation Profile
 * 2. a source upload whose sourceSystem
 *    matches the profile sourceSystem
 * 3. a target upload whose sourceSystem
 *    matches the profile targetSystem
 * 4. both uploads to pass all existing
 *    validation / correction / DQ controls
 *
 * This prevents arbitrary file comparison.
 */
export const createReconciliation = async (
    req: Request,
    res: Response
) => {
    let reconciliationId:
        mongoose.Types.ObjectId | null = null;

    try {
        const {
            profileKey,
            sourceUploadId,
            targetUploadId,
        } = req.body;

        /*
         * A profile is mandatory for every NEW
         * reconciliation created from this point.
         */
        if (
            !profileKey ||
            typeof profileKey !== "string"
        ) {
            return res.status(400).json({
                success: false,
                code:
                    "RECONCILIATION_PROFILE_REQUIRED",
                message:
                    "Select a reconciliation profile before choosing the source and target files.",
            });
        }

        const profile =
            getReconciliationProfile(
                profileKey
            );

        if (!profile) {
            return res.status(400).json({
                success: false,
                code:
                    "INVALID_RECONCILIATION_PROFILE",
                message:
                    "The selected reconciliation profile is not recognized by BankSync.",
            });
        }

        if (
            !mongoose.isValidObjectId(
                sourceUploadId
            ) ||
            !mongoose.isValidObjectId(
                targetUploadId
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid upload ID",
            });
        }

        if (
            sourceUploadId ===
            targetUploadId
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Source and target uploads must be different",
            });
        }

        const [
            sourceUpload,
            targetUpload,
        ] = await Promise.all([
            Upload.findById(
                sourceUploadId
            ),
            Upload.findById(
                targetUploadId
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
         * PAIRING RULE ENFORCEMENT
         * ----------------------------------------
         *
         * Example:
         *
         * ATM_TO_CBS requires:
         *
         * source = ATM
         * target = CBS
         *
         * ATM -> MOBILE_BANKING,
         * CBS -> ATM,
         * or any other arbitrary pair is rejected.
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
                    `The selected files do not match the "${profile.name}" profile. ` +
                    `This profile requires ${profile.sourceSystem} as the Source and ` +
                    `${profile.targetSystem} as the Target, but you selected ` +
                    `${sourceUpload.sourceSystem} -> ${targetUpload.sourceSystem}.`,

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
         * Existing BankSync upload controls remain
         * fully active AFTER the business pair has
         * been validated.
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
                    `Source upload is not eligible for reconciliation: ${sourceBlockReason}`,
            });
        }

        if (targetBlockReason) {
            return res.status(409).json({
                success: false,
                message:
                    `Target upload is not eligible for reconciliation: ${targetBlockReason}`,
            });
        }

        reconciliationId =
            new mongoose.Types.ObjectId();

        /*
         * Store a snapshot of the selected profile.
         *
         * This gives every reconciliation an
         * auditable answer to:
         *
         * "Why were these two systems compared?"
         */
        const reconciliation =
            await Reconciliation.create({
                _id:
                    reconciliationId,

                profileKey:
                    profile.key,

                profileName:
                    profile.name,

                businessReason:
                    profile.businessReason,

                sourceUploadId,
                targetUploadId,

                startedBy:
                    res.locals.user.userId,

                status:
                    "PROCESSING",
            });

        const result =
            await runExactMatching(
                reconciliation._id,
                sourceUploadId,
                targetUploadId
            );

        reconciliation.totalTransactions =
            result.totalTransactions;

        reconciliation.matchedCount =
            result.matchedCount;

        reconciliation.probableMatchCount =
            result.probableMatchCount;

        reconciliation.unmatchedCount =
            result.unmatchedCount;

        reconciliation.mismatchCount =
            result.mismatchCount;

        reconciliation.matchingCompletedAt =
            new Date();

        await reconciliation.save();

        await generateExceptions(
            reconciliation._id.toString()
        );

        reconciliation.status =
            "COMPLETED";

        await reconciliation.save();

        return res.status(201).json({
            success: true,

            message:
                "Reconciliation completed successfully",

            data:
                reconciliation,
        });
    } catch (error) {
        console.error(
            "Reconciliation error:",
            error
        );

        if (reconciliationId) {
            try {
                await Reconciliation.updateOne(
                    {
                        _id:
                            reconciliationId,

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
                    "Unable to mark reconciliation as failed:",
                    statusError
                );
            }
        }

        return res.status(500).json({
            success: false,
            message:
                "Unable to complete reconciliation",
        });
    }
};


export const getReconciliationResults =
    async (
        req: Request,
        res: Response
    ) => {
        try {
            const {
                id,
            } = req.params;

            if (
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

            const reconciliation =
                await Reconciliation.findById(
                    id
                );

            if (!reconciliation) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Reconciliation not found",
                });
            }

            if (
                reconciliation.status !==
                "COMPLETED"
            ) {
                return res.status(409).json({
                    success: false,
                    message:
                        "Reconciliation results are available only after processing completes",
                });
            }

            const results =
                await ReconciliationResult
                    .find({
                        reconciliationId:
                            id,
                    })
                    .populate(
                        "sourceTransactionId"
                    )
                    .populate(
                        "targetTransactionId"
                    )
                    .select(
                        "-__v"
                    );

            return res.status(200).json({
                success: true,
                data:
                    results,
            });
        } catch (error) {
            console.error(
                "Get reconciliation results error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to retrieve reconciliation results",
            });
        }
    };


export const getReconciliations = async (
    _req: Request,
    res: Response
) => {
    try {
        const reconciliations =
            await Reconciliation
                .find()
                .select(
                    "-__v"
                )
                .populate(
                    "startedBy",
                    "name email role"
                )
                .populate(
                    "sourceUploadId",
                    "originalName sourceSystem"
                )
                .populate(
                    "targetUploadId",
                    "originalName sourceSystem"
                )
                .sort({
                    createdAt:
                        -1,
                });

        return res.status(200).json({
            success: true,
            data:
                reconciliations,
        });
    } catch (error) {
        console.error(
            "Get reconciliations error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to retrieve reconciliations",
        });
    }
};
