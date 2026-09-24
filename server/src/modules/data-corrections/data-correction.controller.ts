import mongoose from "mongoose";
import type {
    Request,
    Response,
} from "express";

import {
    Case,
} from "../cases/case.model.js";

import {
    DataQualityIssue,
} from "../data-quality/data-quality.model.js";

import {
    Transaction,
} from "../transactions/transaction.model.js";

import {
    User,
} from "../users/user.model.js";

import {
    DataCorrectionTask,
} from "./data-correction.model.js";

import {
    createBusinessAudit,
} from "../audit/audit.service.js";

import {
    AuditLog,
} from "../audit/audit.model.js";

const getSingleParam = (
    value:
        | string
        | string[]
        | undefined
): string | undefined => {
    if (Array.isArray(value)) {
        return value[0];
    }

    return value;
};

const normalizeInstruction = (
    value: unknown
): string => {
    if (typeof value !== "string") {
        return "";
    }

    return value.trim();
};

const getLatestVerificationFeedback =
    async (
        caseId:
            mongoose.Types.ObjectId
            | string,

        taskId:
            mongoose.Types.ObjectId
            | string
    ) => {
        const audit =
            await AuditLog.findOne({
                eventType:
                    "BUSINESS_EVENT",

                entityType:
                    "CASE",

                entityId:
                    new mongoose.Types.ObjectId(
                        caseId.toString()
                    ),

                action:
                    "DATA_CORRECTION_VERIFICATION_REJECTED",

                "metadata.correctionTaskId":
                    taskId.toString(),
            })
                .populate(
                    "actorId",
                    "_id name email role"
                )
                .sort({
                    createdAt: -1,
                })
                .lean() as any;

        if (!audit) {
            return null;
        }

        return {
            reason:
                audit.metadata
                    ?.reason || "",

            rejectedAt:
                audit.metadata
                    ?.rejectedAt ||
                audit.createdAt,

            rejectedBy:
                audit.actorId ||
                null,
        };
    };

/*
 * ----------------------------------------
 * ACTIVE IMPORT OFFICERS
 * ----------------------------------------
 *
 * Checker uses this small, role-scoped list
 * when handing an approved Data Quality
 * investigation to the source-correction
 * workflow.
 */
export const getActiveImportOfficers =
    async (
        _req: Request,
        res: Response
    ) => {
        try {
            const officers =
                await User.find({
                    role:
                        "IMPORT_OFFICER",

                    isActive:
                        true,
                })
                    .select(
                        "_id name email role"
                    )
                    .sort({
                        name: 1,
                    })
                    .lean();

            return res.status(200).json({
                success: true,
                data: officers,
            });
        } catch (error) {
            console.error(
                "Get active Import Officers error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to load active Import Officers",
            });
        }
    };

/*
 * ----------------------------------------
 * GET CORRECTION TASK FOR CASE
 * ----------------------------------------
 *
 * Used by:
 * - Checker handoff panel
 * - later Import Officer work queue/details
 * - Admin / Operations / Auditor visibility
 *
 * A missing task is a valid state, so this
 * endpoint returns data: null rather than 404.
 */
export const getDataCorrectionTaskByCase =
    async (
        req: Request,
        res: Response
    ) => {
        try {
            const caseId =
                getSingleParam(
                    req.params.caseId
                );

            const currentUser =
                res.locals.user;

            if (
                !caseId ||
                !mongoose.isValidObjectId(
                    caseId
                )
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Invalid case ID",
                    });
            }

            const task =
                await DataCorrectionTask.findOne({
                    caseId:
                        new mongoose.Types.ObjectId(
                            caseId
                        ),
                })
                    .populate({
                        path:
                            "assignedTo",
                        select:
                            "_id name email role isActive",
                    })
                    .populate({
                        path:
                            "requestedBy",
                        select:
                            "_id name email role",
                    })
                    .populate({
                        path:
                            "originalUploadId",
                        select:
                            "_id originalName fileName sourceSystem status totalRows validRows invalidRows createdAt",
                    })
                    .populate({
                        path:
                            "correctedUploadId",
                        select:
                            "_id originalName fileName sourceSystem status totalRows validRows invalidRows createdAt correctionOfUploadId correctionTaskId",
                    })
                    .lean();

            /*
             * Import Officers can only see
             * correction tasks assigned to them.
             */
            if (
                task &&
                currentUser?.role ===
                    "IMPORT_OFFICER"
            ) {
                const assignedId =
                    (
                        task.assignedTo as any
                    )?._id?.toString?.() ||
                    (
                        task.assignedTo as any
                    )?.toString?.();

                if (
                    assignedId !==
                    currentUser.userId
                ) {
                    return res
                        .status(403)
                        .json({
                            success:
                                false,
                            message:
                                "This correction task is not assigned to you",
                        });
                }
            }

            if (!task) {
                return res.status(200).json({
                    success: true,
                    data: null,
                });
            }

            /*
             * ----------------------------------------
             * VERIFICATION EVIDENCE
             * ----------------------------------------
             *
             * Admin / Operations should not have to
             * trust only a status badge.
             *
             * We return:
             * - original affected transaction rows
             * - corrected linked transaction rows
             * - original issue verification status
             *
             * The original transactions remain
             * immutable evidence.
             */
            const issue =
                await DataQualityIssue
                    .findById(
                        task.dataQualityIssueId
                    )
                    .populate({
                        path:
                            "primaryTransactionId",
                        select:
                            "_id transactionId referenceNumber accountNumber amount transactionDate status sourceSystem uploadId",
                    })
                    .populate({
                        path:
                            "relatedTransactionIds",
                        select:
                            "_id transactionId referenceNumber accountNumber amount transactionDate status sourceSystem uploadId",
                    })
                    .lean() as any;

            const originalAffected:
                any[] = [];

            const seenOriginalIds =
                new Set<string>();

            const addOriginal =
                (transaction: any) => {
                    if (!transaction) {
                        return;
                    }

                    const id =
                        transaction._id
                            ?.toString?.();

                    if (
                        !id ||
                        seenOriginalIds.has(
                            id
                        )
                    ) {
                        return;
                    }

                    seenOriginalIds.add(id);
                    originalAffected.push(
                        transaction
                    );
                };

            addOriginal(
                issue
                    ?.primaryTransactionId
            );

            for (
                const transaction
                of issue
                    ?.relatedTransactionIds ||
                []
            ) {
                addOriginal(
                    transaction
                );
            }

            let correctedTransactions:
                any[] = [];

            const correctedUploadId =
                (
                    task.correctedUploadId as any
                )?._id ||
                task.correctedUploadId;

            if (
                correctedUploadId &&
                mongoose.isValidObjectId(
                    correctedUploadId
                )
            ) {
                const transactionIds =
                    Array.from(
                        new Set(
                            originalAffected
                                .map(
                                    (
                                        item
                                    ) =>
                                        item
                                            ?.transactionId
                                )
                                .filter(
                                    Boolean
                                )
                        )
                    );

                const referenceNumbers =
                    Array.from(
                        new Set(
                            originalAffected
                                .map(
                                    (
                                        item
                                    ) =>
                                        item
                                            ?.referenceNumber
                                )
                                .filter(
                                    Boolean
                                )
                        )
                    );

                const matchConditions:
                    Record<
                        string,
                        unknown
                    >[] = [];

                if (
                    transactionIds.length >
                    0
                ) {
                    matchConditions.push({
                        transactionId: {
                            $in:
                                transactionIds,
                        },
                    });
                }

                if (
                    referenceNumbers.length >
                    0
                ) {
                    matchConditions.push({
                        referenceNumber: {
                            $in:
                                referenceNumbers,
                        },
                    });
                }

                if (
                    matchConditions.length >
                    0
                ) {
                    correctedTransactions =
                        await Transaction.find({
                            uploadId:
                                correctedUploadId,

                            $or:
                                matchConditions,
                        })
                            .select(
                                "_id transactionId referenceNumber accountNumber amount transactionDate status sourceSystem uploadId"
                            )
                            .sort({
                                transactionDate:
                                    1,
                                _id: 1,
                            })
                            .lean() as any[];
                }
            }

            const repeatedIssue =
                correctedUploadId &&
                issue
                ? await DataQualityIssue
                    .findOne({
                        uploadId:
                            correctedUploadId,

                        issueType:
                            issue.issueType,

                        keyValue:
                            issue.keyValue,
                    })
                    .select(
                        "_id issueType keyValue status description"
                    )
                    .lean()
                : null;

            const latestVerificationFeedback =
                await getLatestVerificationFeedback(
                    task.caseId as any,
                    task._id as any
                );

            return res.status(200).json({
                success: true,

                data: {
                    ...task,

                    latestVerificationFeedback,

                    verificationEvidence: {
                        issue: issue
                            ? {
                                _id:
                                    issue._id,

                                issueType:
                                    issue.issueType,

                                severity:
                                    issue.severity,

                                status:
                                    issue.status,

                                keyValue:
                                    issue.keyValue,

                                description:
                                    issue.description,

                                verificationUploadId:
                                    issue.verificationUploadId,

                                verificationAttemptedAt:
                                    issue.verificationAttemptedAt,

                                verifiedResolvedAt:
                                    issue.verifiedResolvedAt,
                            }
                            : null,

                        originalAffectedTransactions:
                            originalAffected,

                        correctedTransactions,

                        repeatedIssue:
                            repeatedIssue ||
                            null,

                        verificationPassed:
                            task.status ===
                                "VERIFIED_RESOLVED" &&
                            issue?.status ===
                                "VERIFIED_RESOLVED" &&
                            !repeatedIssue,
                    },
                },
            });
        } catch (error) {
            console.error(
                "Get Data Correction Task error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to load Data Correction Task",
            });
        }
    };

/*
 * ----------------------------------------
 * ADMIN / OPERATIONS - REJECT VERIFICATION
 * ----------------------------------------
 *
 * Automated Data Quality verification proves
 * that the original detector no longer fires.
 * It does NOT prove that every corrected field
 * is operationally authoritative.
 *
 * Admin / Operations can therefore reject the
 * correction after reviewing before/after
 * evidence and return it to the Import Officer.
 *
 * VERIFIED_RESOLVED -> VERIFICATION_FAILED
 */
export const rejectCorrectionVerification =
    async (
        req: Request,
        res: Response
    ) => {
        try {
            const taskId =
                getSingleParam(
                    req.params.taskId
                );

            const actorId =
                res.locals.user?.userId;

            const actorRole =
                res.locals.user?.role;

            const reason =
                typeof req.body?.reason ===
                "string"
                    ? req.body.reason.trim()
                    : "";

            if (
                !taskId ||
                !mongoose.isValidObjectId(
                    taskId
                )
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Invalid correction task ID",
                    });
            }

            if (
                !actorId ||
                !mongoose.isValidObjectId(
                    actorId
                )
            ) {
                return res
                    .status(401)
                    .json({
                        success: false,
                        message:
                            "Authenticated user not found",
                    });
            }

            if (reason.length < 10) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Provide a clear verification rejection reason of at least 10 characters",
                    });
            }

            const task =
                await DataCorrectionTask
                    .findById(taskId);

            if (!task) {
                return res
                    .status(404)
                    .json({
                        success: false,
                        message:
                            "Correction task not found",
                    });
            }

            if (
                task.status !==
                "VERIFIED_RESOLVED"
            ) {
                return res
                    .status(409)
                    .json({
                        success: false,
                        message:
                            "Only a correction currently marked Verified Resolved can be rejected at final operational review",
                    });
            }

            const issue =
                await DataQualityIssue
                    .findById(
                        task.dataQualityIssueId
                    );

            if (!issue) {
                return res
                    .status(409)
                    .json({
                        success: false,
                        message:
                            "Linked Data Quality issue is unavailable",
                    });
            }

            const now =
                new Date();

            task.status =
                "VERIFICATION_FAILED";

            task.verificationFailureReason =
                reason;

            task.verifiedAt =
                null;

            issue.status =
                "VERIFICATION_FAILED";

            issue.verifiedResolvedAt =
                null;

            issue.verificationAttemptedAt =
                now;

            await Promise.all([
                task.save(),
                issue.save(),
            ]);

            await createBusinessAudit({
                actorId,

                actorRole,

                entityType:
                    "CASE",

                entityId:
                    task.caseId.toString(),

                action:
                    "DATA_CORRECTION_VERIFICATION_REJECTED",

                description:
                    "Admin or Operations rejected the corrected data after final operational evidence review",

                metadata: {
                    correctionTaskId:
                        task._id.toString(),

                    dataQualityIssueId:
                        issue._id.toString(),

                    correctedUploadId:
                        task.correctedUploadId
                            ?.toString() ||
                        null,

                    previousTaskStatus:
                        "VERIFIED_RESOLVED",

                    newTaskStatus:
                        "VERIFICATION_FAILED",

                    reason,

                    rejectedAt:
                        now,
                },
            });

            return res
                .status(200)
                .json({
                    success: true,

                    message:
                        "Verification rejected. The correction task has been returned to the Import Officer.",

                    data: {
                        taskId:
                            task._id,

                        taskStatus:
                            task.status,

                        dataQualityIssueStatus:
                            issue.status,

                        reason,
                    },
                });
        } catch (error) {
            if (
                error instanceof
                mongoose.Error
                    .VersionError
            ) {
                return res
                    .status(409)
                    .json({
                        success: false,
                        message:
                            "This correction task changed while your request was being processed. Reload it before trying again",
                    });
            }

            console.error(
                "Reject correction verification error:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,
                    message:
                        "Unable to reject correction verification",
                });
        }
    };

/*
 * ----------------------------------------
 * IMPORT OFFICER - MY CORRECTION TASKS
 * ----------------------------------------
 *
 * Returns only tasks assigned to the
 * authenticated Import Officer.
 */
export const getMyDataCorrectionTasks =
    async (
        _req: Request,
        res: Response
    ) => {
        try {
            const importOfficerId =
                res.locals.user?.userId;

            if (
                !importOfficerId ||
                !mongoose.isValidObjectId(
                    importOfficerId
                )
            ) {
                return res
                    .status(401)
                    .json({
                        success: false,
                        message:
                            "Authenticated Import Officer not found",
                    });
            }

            const tasks =
                await DataCorrectionTask.find({
                    assignedTo:
                        new mongoose.Types.ObjectId(
                            importOfficerId
                        ),

                    status: {
                        $in: [
                            "ASSIGNED",
                            "IN_PROGRESS",
                            "CORRECTED_UPLOAD_SUBMITTED",
                            "VERIFICATION_FAILED",
                            "VERIFIED_RESOLVED",
                        ],
                    },
                })
                    .populate({
                        path:
                            "caseId",
                        select:
                            "_id status priority originType rootCauseCategory proposedAction proposedResolution checkerComment",
                    })
                    .populate({
                        path:
                            "dataQualityIssueId",
                        select:
                            "_id issueType severity status keyValue description sourceSystem primaryTransactionId relatedTransactionIds",

                        populate: [
                            {
                                path:
                                    "primaryTransactionId",
                                select:
                                    "_id transactionId referenceNumber accountNumber amount transactionDate status sourceSystem",
                            },
                            {
                                path:
                                    "relatedTransactionIds",
                                select:
                                    "_id transactionId referenceNumber accountNumber amount transactionDate status sourceSystem",
                            },
                        ],
                    })
                    .populate({
                        path:
                            "originalUploadId",
                        select:
                            "_id originalName fileName sourceSystem status totalRows validRows invalidRows createdAt",
                    })
                    .populate({
                        path:
                            "correctedUploadId",
                        select:
                            "_id originalName fileName sourceSystem status totalRows validRows invalidRows createdAt correctionOfUploadId correctionTaskId",
                    })
                    .populate({
                        path:
                            "requestedBy",
                        select:
                            "_id name email role",
                    })
                    .sort({
                        updatedAt: -1,
                        createdAt: -1,
                    })
                    .lean();

            const tasksWithFeedback =
                await Promise.all(
                    tasks.map(
                        async (
                            task: any
                        ) => ({
                            ...task,

                            latestVerificationFeedback:
                                await getLatestVerificationFeedback(
                                    task.caseId
                                        ?._id ||
                                        task.caseId,

                                    task._id
                                ),
                        })
                    )
                );

            return res
                .status(200)
                .json({
                    success: true,
                    data:
                        tasksWithFeedback,
                });
        } catch (error) {
            console.error(
                "Get my Data Correction Tasks error:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,
                    message:
                        "Unable to load assigned correction tasks",
                });
        }
    };

/*
 * ----------------------------------------
 * IMPORT OFFICER - START CORRECTION
 * ----------------------------------------
 *
 * ASSIGNED -> IN_PROGRESS
 *
 * A failed verification attempt can also be
 * resumed:
 *
 * VERIFICATION_FAILED -> IN_PROGRESS
 */
export const startDataCorrectionTask =
    async (
        req: Request,
        res: Response
    ) => {
        try {
            const taskId =
                getSingleParam(
                    req.params.taskId
                );

            const importOfficerId =
                res.locals.user?.userId;

            const actorRole =
                res.locals.user?.role;

            if (
                !taskId ||
                !mongoose.isValidObjectId(
                    taskId
                )
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Invalid correction task ID",
                    });
            }

            if (
                !importOfficerId ||
                !mongoose.isValidObjectId(
                    importOfficerId
                )
            ) {
                return res
                    .status(401)
                    .json({
                        success: false,
                        message:
                            "Authenticated Import Officer not found",
                    });
            }

            const task =
                await DataCorrectionTask.findById(
                    taskId
                );

            if (!task) {
                return res
                    .status(404)
                    .json({
                        success: false,
                        message:
                            "Correction task not found",
                    });
            }

            if (
                !task.assignedTo ||
                task.assignedTo.toString() !==
                    importOfficerId
            ) {
                return res
                    .status(403)
                    .json({
                        success: false,
                        message:
                            "This correction task is not assigned to you",
                    });
            }

            if (
                ![
                    "ASSIGNED",
                    "VERIFICATION_FAILED",
                ].includes(
                    task.status
                )
            ) {
                return res
                    .status(409)
                    .json({
                        success: false,
                        message:
                            task.status ===
                            "IN_PROGRESS"
                                ? "Correction task is already in progress"
                                : "This correction task cannot be started in its current status",
                    });
            }

            const previousStatus =
                task.status;

            const now =
                new Date();

            task.status =
                "IN_PROGRESS";

            if (!task.startedAt) {
                task.startedAt =
                    now;
            }

            /*
             * Preserve the previous verification
             * feedback while the Import Officer
             * works on the next correction attempt.
             *
             * The feedback is the operational reason
             * for the retry and must remain visible.
             */
            await task.save();

            await createBusinessAudit({
                actorId:
                    importOfficerId,

                actorRole,

                entityType:
                    "CASE",

                entityId:
                    task.caseId.toString(),

                action:
                    "DATA_CORRECTION_STARTED",

                description:
                    previousStatus ===
                    "VERIFICATION_FAILED"
                        ? "Import Officer restarted source-data correction after failed verification"
                        : "Import Officer started the assigned source-data correction task",

                metadata: {
                    correctionTaskId:
                        task._id.toString(),

                    previousStatus,

                    newStatus:
                        "IN_PROGRESS",

                    dataQualityIssueId:
                        task.dataQualityIssueId.toString(),

                    originalUploadId:
                        task.originalUploadId.toString(),
                },
            });

            const populatedTask =
                await DataCorrectionTask.findById(
                    task._id
                )
                    .populate({
                        path:
                            "caseId",
                        select:
                            "_id status priority originType rootCauseCategory proposedAction proposedResolution checkerComment",
                    })
                    .populate({
                        path:
                            "dataQualityIssueId",
                        select:
                            "_id issueType severity status keyValue description sourceSystem primaryTransactionId relatedTransactionIds",

                        populate: [
                            {
                                path:
                                    "primaryTransactionId",
                                select:
                                    "_id transactionId referenceNumber accountNumber amount transactionDate status sourceSystem",
                            },
                            {
                                path:
                                    "relatedTransactionIds",
                                select:
                                    "_id transactionId referenceNumber accountNumber amount transactionDate status sourceSystem",
                            },
                        ],
                    })
                    .populate({
                        path:
                            "originalUploadId",
                        select:
                            "_id originalName fileName sourceSystem status totalRows validRows invalidRows createdAt",
                    })
                    .populate({
                        path:
                            "correctedUploadId",
                        select:
                            "_id originalName fileName sourceSystem status totalRows validRows invalidRows createdAt correctionOfUploadId correctionTaskId",
                    })
                    .populate({
                        path:
                            "requestedBy",
                        select:
                            "_id name email role",
                    })
                    .lean();

            const latestVerificationFeedback =
                await getLatestVerificationFeedback(
                    task.caseId,
                    task._id
                );

            return res
                .status(200)
                .json({
                    success: true,
                    message:
                        "Correction task started",
                    data: populatedTask
                        ? {
                            ...populatedTask,

                            latestVerificationFeedback,
                        }
                        : populatedTask,
                });
        } catch (error) {
            if (
                error instanceof
                mongoose.Error
                    .VersionError
            ) {
                return res
                    .status(409)
                    .json({
                        success: false,
                        message:
                            "This correction task changed while your request was being processed. Reload it before trying again",
                    });
            }

            console.error(
                "Start Data Correction Task error:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,
                    message:
                        "Unable to start correction task",
                });
        }
    };

/*
 * ----------------------------------------
 * REQUEST DATA CORRECTION
 * ----------------------------------------
 *
 * Preconditions:
 *
 * - Checker is authenticated
 * - Case is DATA_QUALITY_ISSUE
 * - Maker investigation was already approved
 * - This Checker is the Checker who approved it
 * - Original upload exists
 * - Active Import Officer is selected
 * - No correction task already exists
 *
 * Effects:
 *
 * - Creates one DataCorrectionTask
 * - Assigns it to Import Officer
 * - Data Quality issue -> CORRECTION_REQUIRED
 * - Case remains APPROVED
 * - Original upload remains immutable
 */
export const requestDataCorrection =
    async (
        req: Request,
        res: Response
    ) => {
        const session =
            await mongoose.startSession();

        try {
            const caseId =
                getSingleParam(
                    req.params.caseId
                );

            const checkerId =
                res.locals.user?.userId;

            const checkerRole =
                res.locals.user?.role;

            const importOfficerId =
                req.body
                    ?.importOfficerId;

            const checkerInstruction =
                normalizeInstruction(
                    req.body
                        ?.checkerInstruction
                );

            if (
                !caseId ||
                !mongoose.isValidObjectId(
                    caseId
                )
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Invalid case ID",
                    });
            }

            if (
                !checkerId ||
                !mongoose.isValidObjectId(
                    checkerId
                )
            ) {
                return res
                    .status(401)
                    .json({
                        success: false,
                        message:
                            "Authenticated Checker not found",
                    });
            }

            if (
                typeof importOfficerId !==
                    "string" ||
                !mongoose.isValidObjectId(
                    importOfficerId
                )
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Select a valid Import Officer",
                    });
            }

            if (
                checkerInstruction.length <
                10
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Provide a clear correction instruction of at least 10 characters",
                    });
            }

            const result =
                await session.withTransaction(
                    async () => {
                        const caseRecord =
                            await Case.findById(
                                caseId
                            ).session(
                                session
                            );

                        if (
                            !caseRecord
                        ) {
                            const error =
                                new Error(
                                    "CASE_NOT_FOUND"
                                );

                            throw error;
                        }

                        const originType =
                            caseRecord.originType ||
                            (caseRecord.dataQualityIssueId
                                ? "DATA_QUALITY_ISSUE"
                                : "RECONCILIATION_EXCEPTION");

                        if (
                            originType !==
                            "DATA_QUALITY_ISSUE"
                        ) {
                            const error =
                                new Error(
                                    "NOT_DATA_QUALITY_CASE"
                                );

                            throw error;
                        }

                        if (
                            caseRecord.status !==
                            "APPROVED"
                        ) {
                            const error =
                                new Error(
                                    "CASE_NOT_APPROVED"
                                );

                            throw error;
                        }

                        /*
                         * Keep the Checker handoff
                         * attributable to the person
                         * who actually approved the
                         * investigation.
                         */
                        if (
                            !caseRecord.checkedBy ||
                            caseRecord.checkedBy
                                .toString() !==
                                checkerId
                        ) {
                            const error =
                                new Error(
                                    "CHECKER_NOT_OWNER"
                                );

                            throw error;
                        }

                        if (
                            !caseRecord
                                .dataQualityIssueId
                        ) {
                            const error =
                                new Error(
                                    "DQ_ISSUE_MISSING"
                                );

                            throw error;
                        }

                        const issue =
                            await DataQualityIssue.findById(
                                caseRecord
                                    .dataQualityIssueId
                            ).session(
                                session
                            );

                        if (!issue) {
                            const error =
                                new Error(
                                    "DQ_ISSUE_NOT_FOUND"
                                );

                            throw error;
                        }

                        if (
                            issue.status ===
                                "VERIFIED_RESOLVED" ||
                            issue.status ===
                                "RESOLVED"
                        ) {
                            const error =
                                new Error(
                                    "DQ_ALREADY_RESOLVED"
                                );

                            throw error;
                        }

                        const originalUploadId =
                            caseRecord
                                .originalUploadId ||
                            issue.uploadId;

                        if (
                            !originalUploadId
                        ) {
                            const error =
                                new Error(
                                    "ORIGINAL_UPLOAD_MISSING"
                                );

                            throw error;
                        }

                        const importOfficer =
                            await User.findOne({
                                _id:
                                    importOfficerId,

                                role:
                                    "IMPORT_OFFICER",

                                isActive:
                                    true,
                            })
                                .session(
                                    session
                                )
                                .select(
                                    "_id name email role isActive"
                                );

                        if (
                            !importOfficer
                        ) {
                            const error =
                                new Error(
                                    "IMPORT_OFFICER_INVALID"
                                );

                            throw error;
                        }

                        const existingTask =
                            await DataCorrectionTask.findOne({
                                $or: [
                                    {
                                        caseId:
                                            caseRecord._id,
                                    },
                                    {
                                        dataQualityIssueId:
                                            issue._id,
                                    },
                                ],
                            })
                                .session(
                                    session
                                )
                                .select(
                                    "_id status"
                                )
                                .lean();

                        if (
                            existingTask
                        ) {
                            const error =
                                new Error(
                                    "CORRECTION_TASK_EXISTS"
                                );

                            throw error;
                        }

                        const now =
                            new Date();

                        const created =
                            await DataCorrectionTask.create(
                                [
                                    {
                                        caseId:
                                            caseRecord._id,

                                        dataQualityIssueId:
                                            issue._id,

                                        originalUploadId,

                                        correctedUploadId:
                                            null,

                                        requestedBy:
                                            new mongoose.Types.ObjectId(
                                                checkerId
                                            ),

                                        requestedAt:
                                            now,

                                        checkerInstruction,

                                        assignedTo:
                                            importOfficer._id,

                                        assignedBy:
                                            new mongoose.Types.ObjectId(
                                                checkerId
                                            ),

                                        assignedAt:
                                            now,

                                        status:
                                            "ASSIGNED",
                                    },
                                ],
                                {
                                    session,
                                }
                            );

                        issue.status =
                            "CORRECTION_REQUIRED";

                        await issue.save({
                            session,
                        });

                        return {
                            task:
                                created[0],

                            importOfficer,
                            issue,
                            originalUploadId,
                        };
                    }
                );

            if (!result) {
                return res
                    .status(500)
                    .json({
                        success: false,
                        message:
                            "Unable to create correction task",
                    });
            }

            await createBusinessAudit({
                actorId:
                    checkerId,

                actorRole:
                    checkerRole,

                entityType:
                    "CASE",

                entityId:
                    caseId,

                action:
                    "DATA_CORRECTION_REQUESTED",

                description:
                    "Checker requested source-data correction after approving a Data Quality investigation",

                metadata: {
                    caseId,

                    correctionTaskId:
                        result.task._id.toString(),

                    dataQualityIssueId:
                        result.issue._id.toString(),

                    originalUploadId:
                        result.originalUploadId.toString(),

                    assignedImportOfficerId:
                        result.importOfficer._id.toString(),

                    taskStatus:
                        "ASSIGNED",

                    dataQualityIssueStatus:
                        "CORRECTION_REQUIRED",

                    caseStatus:
                        "APPROVED",
                },
            });

            const populatedTask =
                await DataCorrectionTask.findById(
                    result.task._id
                )
                    .populate({
                        path:
                            "assignedTo",
                        select:
                            "_id name email role",
                    })
                    .populate({
                        path:
                            "requestedBy",
                        select:
                            "_id name email role",
                    })
                    .populate({
                        path:
                            "originalUploadId",
                        select:
                            "_id originalName fileName sourceSystem status totalRows validRows invalidRows",
                    })
                    .lean();

            return res
                .status(201)
                .json({
                    success: true,

                    message:
                        "Data correction requested and assigned to Import Officer",

                    data:
                        populatedTask,
                });
        } catch (error: any) {
            const code =
                error?.message;

            if (
                code ===
                "CASE_NOT_FOUND"
            ) {
                return res
                    .status(404)
                    .json({
                        success: false,
                        message:
                            "Case not found",
                    });
            }

            if (
                code ===
                "NOT_DATA_QUALITY_CASE"
            ) {
                return res
                    .status(409)
                    .json({
                        success: false,
                        message:
                            "Data correction tasks can only be created from Data Quality cases",
                    });
            }

            if (
                code ===
                "CASE_NOT_APPROVED"
            ) {
                return res
                    .status(409)
                    .json({
                        success: false,
                        message:
                            "The Data Quality investigation must be approved before requesting correction",
                    });
            }

            if (
                code ===
                "CHECKER_NOT_OWNER"
            ) {
                return res
                    .status(403)
                    .json({
                        success: false,
                        message:
                            "Only the Checker who approved this investigation can request its correction handoff",
                    });
            }

            if (
                code ===
                    "DQ_ISSUE_MISSING" ||
                code ===
                    "DQ_ISSUE_NOT_FOUND"
            ) {
                return res
                    .status(409)
                    .json({
                        success: false,
                        message:
                            "The linked Data Quality issue is unavailable",
                    });
            }

            if (
                code ===
                "DQ_ALREADY_RESOLVED"
            ) {
                return res
                    .status(409)
                    .json({
                        success: false,
                        message:
                            "This Data Quality issue is already resolved",
                    });
            }

            if (
                code ===
                "ORIGINAL_UPLOAD_MISSING"
            ) {
                return res
                    .status(409)
                    .json({
                        success: false,
                        message:
                            "The original banking upload is unavailable",
                    });
            }

            if (
                code ===
                "IMPORT_OFFICER_INVALID"
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "The selected Import Officer is not active or does not have the Import Officer role",
                    });
            }

            if (
                code ===
                "CORRECTION_TASK_EXISTS"
            ) {
                return res
                    .status(409)
                    .json({
                        success: false,
                        message:
                            "A correction task already exists for this Data Quality investigation",
                    });
            }

            if (
                error?.code === 11000
            ) {
                return res
                    .status(409)
                    .json({
                        success: false,
                        message:
                            "A correction task already exists for this Data Quality investigation",
                    });
            }

            console.error(
                "Request data correction error:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,
                    message:
                        "Unable to request data correction",
                });
        } finally {
            await session.endSession();
        }
    };
