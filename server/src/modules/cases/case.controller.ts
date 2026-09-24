import type {
    Request,
    Response,
} from "express";

import mongoose from "mongoose";

import { Case } from "./case.model.js";
import { saveCaseAndException } from "./case.persistence.js";
import { User } from "../users/user.model.js";
import { createBusinessAudit } from "../audit/audit.service.js";

type ChecklistKey =
    | "sourceDatasetReviewed"
    | "targetDatasetReviewed"
    | "rejectedRowsReviewed"
    | "accountChecked"
    | "referenceChecked"
    | "amountChecked"
    | "transactionDateChecked"
    | "duplicateSearchPerformed";

interface UploadValidationContext {
    invalidRows?: number;
}

interface ReconciliationValidationContext {
    sourceUploadId?: UploadValidationContext;
    targetUploadId?: UploadValidationContext;
}

interface ExceptionValidationContext {
    reconciliationId?: ReconciliationValidationContext;
}

const RECONCILIATION_REQUIRED_CHECKS: Array<{
    key: ChecklistKey;
    label: string;
}> = [
    {
        key: "sourceDatasetReviewed",
        label: "Source dataset reviewed",
    },
    {
        key: "targetDatasetReviewed",
        label: "Target dataset reviewed",
    },
    {
        key: "accountChecked",
        label: "Account checked",
    },
    {
        key: "referenceChecked",
        label: "Reference checked",
    },
    {
        key: "amountChecked",
        label: "Amount checked",
    },
    {
        key: "transactionDateChecked",
        label: "Transaction date checked",
    },
    {
        key: "duplicateSearchPerformed",
        label: "Duplicate search performed",
    },
];

const DATA_QUALITY_REQUIRED_CHECKS: Array<{
    key: ChecklistKey;
    label: string;
}> = [
    {
        key: "sourceDatasetReviewed",
        label: "Original uploaded dataset reviewed",
    },
    {
        key: "accountChecked",
        label: "Affected account data checked",
    },
    {
        key: "referenceChecked",
        label: "Reference data checked",
    },
    {
        key: "amountChecked",
        label: "Amount data checked",
    },
    {
        key: "transactionDateChecked",
        label: "Transaction dates checked",
    },
    {
        key: "duplicateSearchPerformed",
        label: "Related-record search performed",
    },
];

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

const hasText = (
    value: unknown
): boolean => {
    return (
        typeof value === "string" &&
        value.trim().length > 0
    );
};

const requiresRejectedRowsReview = async (
    caseId: string
): Promise<boolean> => {
    const caseContext =
        await Case.findById(caseId)
            .select(
                "originType exceptionId dataQualityIssueId originalUploadId"
            )
            .populate({
                path: "exceptionId",
                select: "reconciliationId",
                populate: {
                    path: "reconciliationId",
                    select:
                        "sourceUploadId targetUploadId",
                    populate: [
                        {
                            path: "sourceUploadId",
                            select: "invalidRows",
                        },
                        {
                            path: "targetUploadId",
                            select: "invalidRows",
                        },
                    ],
                },
            })
            .populate({
                path: "originalUploadId",
                select: "invalidRows",
            })
            .lean();

    if (!caseContext) {
        return false;
    }

    const isDataQualityCase =
        caseContext.originType ===
            "DATA_QUALITY_ISSUE" ||
        Boolean(
            caseContext.dataQualityIssueId &&
                !caseContext.exceptionId
        );

    /*
     * DATA QUALITY CASE
     *
     * There is only one original uploaded
     * banking dataset at this stage.
     *
     * If that upload contains rejected rows,
     * the Maker must review them because a
     * relevant related record may have been
     * excluded during validation.
     */
    if (isDataQualityCase) {
        const originalUpload =
            caseContext.originalUploadId as unknown as
                | UploadValidationContext
                | null
                | undefined;

        return (
            Number(
                originalUpload
                    ?.invalidRows ?? 0
            ) > 0
        );
    }

    /*
     * RECONCILIATION EXCEPTION CASE
     *
     * Preserve the existing BankSync rule:
     * rejected rows on either reconciliation
     * side must be reviewed.
     */
    const exception =
        caseContext.exceptionId as unknown as
            | ExceptionValidationContext
            | null
            | undefined;

    const reconciliation =
        exception?.reconciliationId;

    const sourceInvalidRows =
        Number(
            reconciliation
                ?.sourceUploadId
                ?.invalidRows ?? 0
        );

    const targetInvalidRows =
        Number(
            reconciliation
                ?.targetUploadId
                ?.invalidRows ?? 0
        );

    return (
        sourceInvalidRows > 0 ||
        targetInvalidRows > 0
    );
};

export const getCases = async (
    _req: Request,
    res: Response
) => {
    try {
        const currentUser =
            res.locals.user;

        const filter =
            currentUser.role === "MAKER"
                ? {
                      assignedTo:
                          currentUser.userId,
                  }
                : {};

        const cases =
            await Case.find(filter)
                .select("-__v")
                .populate({
                    path: "exceptionId",
                    select:
                        "exceptionType reasons status transactionId reconciliationId",

                    populate: {
                        path: "transactionId",
                        select:
                            "transactionId sourceSystem referenceNumber accountNumber amount transactionDate status",
                    },
                })
                .populate(
                    "assignedTo",
                    "name email role"
                )
                .populate(
                    "assignedBy",
                    "name email role"
                )
                .populate(
                    "submittedBy",
                    "name email role"
                )
                .populate(
                    "checkedBy",
                    "name email role"
                )
                .sort({
                    createdAt: -1,
                });

        return res.status(200).json({
            success: true,
            data: cases,
        });
    } catch (error) {
        console.error(
            "Get cases error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to retrieve cases",
        });
    }
};

export const getCaseById = async (
    req: Request,
    res: Response
) => {
    try {
        const id =
            getSingleParam(
                req.params.id
            );

        const currentUser =
            res.locals.user;

        if (
            !id ||
            !mongoose.isValidObjectId(
                id
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid case ID",
            });
        }

        const caseRecord =
            await Case.findById(id)
                .select("-__v")

                /*
                 * ====================================
                 * RECONCILIATION EXCEPTION ORIGIN
                 * ====================================
                 *
                 * Existing BankSync workflow:
                 *
                 * Reconciliation
                 *      ↓
                 * Exception
                 *      ↓
                 * Case
                 */
                .populate({
                    path: "exceptionId",

                    select:
                        "exceptionType reasons status transactionId reconciliationResultId reconciliationId",

                    populate: [
                        {
                            path:
                                "transactionId",
                        },

                        {
                            path:
                                "reconciliationResultId",

                            populate: [
                                {
                                    path:
                                        "sourceTransactionId",
                                },

                                {
                                    path:
                                        "targetTransactionId",
                                },
                            ],
                        },

                        {
                            path:
                                "reconciliationId",

                            populate: [
                                {
                                    path:
                                        "sourceUploadId",

                                    select:
                                        "originalName fileName sourceSystem status totalRows validRows invalidRows",
                                },

                                {
                                    path:
                                        "targetUploadId",

                                    select:
                                        "originalName fileName sourceSystem status totalRows validRows invalidRows",
                                },
                            ],
                        },
                    ],
                })

                /*
                 * ====================================
                 * DATA QUALITY ORIGIN
                 * ====================================
                 *
                 * Supporting reconciliation-integrity
                 * workflow:
                 *
                 * Uploaded transaction data
                 *      ↓
                 * Data Quality defect
                 *      ↓
                 * Case
                 *      ↓
                 * Corrected data
                 *      ↓
                 * Reconciliation-ready dataset
                 */
                .populate({
                    path:
                        "dataQualityIssueId",

                    select: [
                        "issueType",
                        "severity",
                        "status",
                        "keyValue",
                        "description",
                        "sourceSystem",
                        "uploadId",
                        "primaryTransactionId",
                        "relatedTransactionIds",
                        "verificationUploadId",
                        "reviewStartedAt",
                        "verifiedResolvedAt",
                    ].join(" "),

                    populate: [
                        {
                            path:
                                "uploadId",

                            select:
                                "originalName fileName sourceSystem status totalRows validRows invalidRows createdAt",
                        },

                        {
                            path:
                                "primaryTransactionId",
                        },

                        {
                            path:
                                "relatedTransactionIds",
                        },

                        {
                            path:
                                "verificationUploadId",

                            select:
                                "originalName fileName sourceSystem status totalRows validRows invalidRows createdAt",
                        },
                    ],
                })

                /*
                 * Direct Case reference to the
                 * original upload.
                 *
                 * This keeps immutable evidence of
                 * the dataset that triggered the
                 * investigation.
                 */
                .populate(
                    "originalUploadId",

                    "originalName fileName sourceSystem status totalRows validRows invalidRows createdAt"
                )

                /*
                 * ====================================
                 * CASE WORKFLOW PEOPLE
                 * ====================================
                 */
                .populate(
                    "assignedTo",
                    "name email role"
                )

                .populate(
                    "assignedBy",
                    "name email role"
                )

                .populate(
                    "submittedBy",
                    "name email role"
                )

                .populate(
                    "checkedBy",
                    "name email role"
                );

        if (!caseRecord) {
            return res.status(404).json({
                success: false,
                message:
                    "Case not found",
            });
        }

        /*
         * Maker can only open a Case that is
         * specifically assigned to that Maker.
         *
         * This applies to both:
         *
         * - Reconciliation exception Cases
         * - Data Quality investigation Cases
         */
        if (
            currentUser.role ===
                "MAKER" &&
            caseRecord.assignedTo?._id.toString() !==
                currentUser.userId
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "You are not assigned to this case",
            });
        }

        return res.status(200).json({
            success: true,
            data: caseRecord,
        });
    } catch (error) {
        console.error(
            "Get case error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to retrieve case",
        });
    }
};

export const assignCase = async (
    req: Request,
    res: Response
) => {
    try {
        const id =
            getSingleParam(
                req.params.id
            );

        const makerId =
            getSingleParam(
                req.body?.makerId
            );

        if (
            !id ||
            !makerId ||
            !mongoose.isValidObjectId(
                id
            ) ||
            !mongoose.isValidObjectId(
                makerId
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid case or Maker ID",
            });
        }

        const maker =
            await User.findById(
                makerId
            );

        if (
            !maker ||
            !maker.isActive ||
            maker.role !== "MAKER"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Selected user must be an active Maker",
            });
        }

        const caseRecord =
            await Case.findById(id);

        if (!caseRecord) {
            return res.status(404).json({
                success: false,
                message:
                    "Case not found",
            });
        }

        if (
            ![
                "OPEN",
                "ASSIGNED",
            ].includes(
                caseRecord.status
            )
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Case cannot be assigned in its current status",
            });
        }

        const previousStatus =
            caseRecord.status;

        caseRecord.assignedTo =
            maker._id;

        caseRecord.assignedBy =
            res.locals.user.userId;

        caseRecord.assignedAt =
            new Date();

        caseRecord.status =
            "ASSIGNED";

        await saveCaseAndException(
            caseRecord
        );

        await createBusinessAudit({
            actorId:
                res.locals.user.userId,

            actorRole:
                res.locals.user.role,

            entityType: "CASE",

            entityId:
                caseRecord._id.toString(),

            action: "CASE_ASSIGNED",

            description:
                "Case assigned to Maker",

            metadata: {
                previousStatus,
                newStatus:
                    "ASSIGNED",

                assignedMakerId:
                    maker._id.toString(),
            },
        });

        return res.status(200).json({
            success: true,
            message:
                "Case assigned successfully",
            data: caseRecord,
        });
    } catch (error) {
        if (
            error instanceof
            mongoose.Error.VersionError
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "This case changed while your request was being processed. Reload it before trying again",
            });
        }

        console.error(
            "Assign case error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to assign case",
        });
    }
};

export const startInvestigation =
    async (
        req: Request,
        res: Response
    ) => {
        try {
            const id =
                getSingleParam(
                    req.params.id
                );

            const makerId =
                res.locals.user.userId;

            if (
                !id ||
                !mongoose.isValidObjectId(
                    id
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

            const caseRecord =
                await Case.findById(
                    id
                );

            if (!caseRecord) {
                return res
                    .status(404)
                    .json({
                        success: false,
                        message:
                            "Case not found",
                    });
            }

            if (
                caseRecord.assignedTo?.toString() !==
                makerId
            ) {
                return res
                    .status(403)
                    .json({
                        success: false,
                        message:
                            "This case is not assigned to you",
                    });
            }

            if (
                ![
                    "ASSIGNED",
                    "RETURNED_TO_MAKER",
                ].includes(
                    caseRecord.status
                )
            ) {
                return res
                    .status(409)
                    .json({
                        success: false,
                        message:
                            "Investigation cannot be started in the current status",
                    });
            }

            const previousStatus =
                caseRecord.status;

            const isReopened =
                previousStatus ===
                "RETURNED_TO_MAKER";

            caseRecord.status =
                "UNDER_INVESTIGATION";

            caseRecord.investigationStartedAt =
                new Date();

            await caseRecord.save();

            await createBusinessAudit({
                actorId: makerId,

                actorRole:
                    res.locals.user.role,

                entityType: "CASE",

                entityId:
                    caseRecord._id.toString(),

                action: isReopened
                    ? "INVESTIGATION_REOPENED"
                    : "INVESTIGATION_STARTED",

                description: isReopened
                    ? "Maker reopened the investigation after Checker return"
                    : "Maker started the case investigation",

                metadata: {
                    previousStatus,
                    newStatus:
                        "UNDER_INVESTIGATION",
                },
            });

            return res
                .status(200)
                .json({
                    success: true,
                    message:
                        "Investigation started",
                    data: caseRecord,
                });
        } catch (error) {
            if (
                error instanceof
                mongoose.Error.VersionError
            ) {
                return res
                    .status(409)
                    .json({
                        success: false,
                        message:
                            "This case changed while your request was being processed. Reload it before trying again",
                    });
            }

            console.error(
                "Start investigation error:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,
                    message:
                        "Unable to start investigation",
                });
        }
    };

export const updateInvestigation =
    async (
        req: Request,
        res: Response
    ) => {
        try {
            const id =
                getSingleParam(
                    req.params.id
                );

            const {
                investigationChecklist,
                rootCauseCategory,
                rootCauseDetails,
                investigationNotes,
                evidenceSummary,
                proposedAction,
                proposedResolution,
            } = req.body;

            const makerId =
                res.locals.user.userId;

            if (
                !id ||
                !mongoose.isValidObjectId(
                    id
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

            const caseRecord =
                await Case.findById(
                    id
                );

            if (!caseRecord) {
                return res
                    .status(404)
                    .json({
                        success: false,
                        message:
                            "Case not found",
                    });
            }

            if (
                caseRecord.assignedTo?.toString() !==
                makerId
            ) {
                return res
                    .status(403)
                    .json({
                        success: false,
                        message:
                            "This case is not assigned to you",
                    });
            }

            if (
                caseRecord.status !==
                "UNDER_INVESTIGATION"
            ) {
                return res
                    .status(409)
                    .json({
                        success: false,
                        message:
                            "Case is not under investigation",
                    });
            }

            const updatedSections: string[] =
                [];

            if (
                investigationChecklist !==
                undefined
            ) {
                const currentChecklist =
                    caseRecord.investigationChecklist;

                caseRecord.set(
                    "investigationChecklist",
                    {
                        sourceDatasetReviewed:
                            currentChecklist
                                ?.sourceDatasetReviewed ??
                            false,

                        targetDatasetReviewed:
                            currentChecklist
                                ?.targetDatasetReviewed ??
                            false,

                        rejectedRowsReviewed:
                            currentChecklist
                                ?.rejectedRowsReviewed ??
                            false,

                        accountChecked:
                            currentChecklist
                                ?.accountChecked ??
                            false,

                        referenceChecked:
                            currentChecklist
                                ?.referenceChecked ??
                            false,

                        amountChecked:
                            currentChecklist
                                ?.amountChecked ??
                            false,

                        transactionDateChecked:
                            currentChecklist
                                ?.transactionDateChecked ??
                            false,

                        duplicateSearchPerformed:
                            currentChecklist
                                ?.duplicateSearchPerformed ??
                            false,

                        ...investigationChecklist,
                    }
                );

                updatedSections.push(
                    "investigationChecklist"
                );
            }

            if (
                rootCauseCategory !==
                undefined
            ) {
                caseRecord.set(
                    "rootCauseCategory",
                    rootCauseCategory
                );

                updatedSections.push(
                    "rootCauseCategory"
                );
            }

            if (
                rootCauseDetails !==
                undefined
            ) {
                caseRecord.set(
                    "rootCauseDetails",
                    rootCauseDetails
                );

                updatedSections.push(
                    "rootCauseDetails"
                );
            }

            if (
                investigationNotes !==
                undefined
            ) {
                caseRecord.investigationNotes =
                    investigationNotes;

                updatedSections.push(
                    "investigationNotes"
                );
            }

            if (
                evidenceSummary !==
                undefined
            ) {
                caseRecord.set(
                    "evidenceSummary",
                    evidenceSummary
                );

                updatedSections.push(
                    "evidenceSummary"
                );
            }

            if (
                proposedAction !==
                undefined
            ) {
                caseRecord.set(
                    "proposedAction",
                    proposedAction
                );

                updatedSections.push(
                    "proposedAction"
                );
            }

            if (
                proposedResolution !==
                undefined
            ) {
                caseRecord.proposedResolution =
                    proposedResolution;

                updatedSections.push(
                    "proposedResolution"
                );
            }

            await caseRecord.save();

            await createBusinessAudit({
                actorId: makerId,

                actorRole:
                    res.locals.user.role,

                entityType: "CASE",

                entityId:
                    caseRecord._id.toString(),

                action:
                    "INVESTIGATION_UPDATED",

                description:
                    "Maker updated the case investigation",

                metadata: {
                    status:
                        caseRecord.status,

                    updatedSections,
                },
            });

            return res
                .status(200)
                .json({
                    success: true,
                    message:
                        "Investigation updated successfully",
                    data: caseRecord,
                });
        } catch (error) {
            if (
                error instanceof
                mongoose.Error.VersionError
            ) {
                return res
                    .status(409)
                    .json({
                        success: false,
                        message:
                            "This case changed while your request was being processed. Reload it before trying again",
                    });
            }

            console.error(
                "Update investigation error:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,
                    message:
                        "Unable to update investigation",
                });
        }
    };

export const submitCase = async (
    req: Request,
    res: Response
) => {
    try {
        const id =
            getSingleParam(
                req.params.id
            );

        const makerId =
            res.locals.user.userId;

        if (
            !id ||
            !mongoose.isValidObjectId(
                id
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid case ID",
            });
        }

        const caseRecord =
            await Case.findById(id);

        if (!caseRecord) {
            return res.status(404).json({
                success: false,
                message:
                    "Case not found",
            });
        }

        if (
            caseRecord.assignedTo?.toString() !==
            makerId
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "This case is not assigned to you",
            });
        }

        if (
            caseRecord.status !==
            "UNDER_INVESTIGATION"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Case cannot be submitted in the current status",
            });
        }

        const missingRequirements: string[] =
            [];

        const checklist =
            caseRecord.investigationChecklist;

        /*
         * ----------------------------------------
         * ORIGIN-AWARE INVESTIGATION REQUIREMENTS
         * ----------------------------------------
         *
         * BankSync remains a reconciliation
         * platform, but a Data Quality Case starts
         * before source-vs-target reconciliation.
         *
         * Therefore:
         *
         * RECONCILIATION_EXCEPTION
         * → requires source + target review.
         *
         * DATA_QUALITY_ISSUE
         * → requires review of the original banking
         *   upload and affected transaction evidence,
         *   but does NOT invent a target dataset.
         */
        const caseOriginType =
            caseRecord.originType ||
            (caseRecord.dataQualityIssueId
                ? "DATA_QUALITY_ISSUE"
                : "RECONCILIATION_EXCEPTION");

        const requiredChecks =
            caseOriginType ===
            "DATA_QUALITY_ISSUE"
                ? DATA_QUALITY_REQUIRED_CHECKS
                : RECONCILIATION_REQUIRED_CHECKS;

        for (
            const requirement of
            requiredChecks
        ) {
            if (
                !checklist?.[
                    requirement.key
                ]
            ) {
                missingRequirements.push(
                    requirement.label
                );
            }
        }

        const rejectedRowReviewRequired =
            await requiresRejectedRowsReview(
                id
            );

        if (
            rejectedRowReviewRequired &&
            !checklist?.rejectedRowsReviewed
        ) {
            missingRequirements.push(
                "Rejected rows reviewed"
            );
        }

        if (
            !hasText(
                caseRecord.rootCauseCategory
            )
        ) {
            missingRequirements.push(
                "Root cause category"
            );
        }

        if (
            !hasText(
                caseRecord.rootCauseDetails
            )
        ) {
            missingRequirements.push(
                "Root cause details"
            );
        }

        if (
            !hasText(
                caseRecord.investigationNotes
            )
        ) {
            missingRequirements.push(
                "Investigation findings"
            );
        }

        if (
            !hasText(
                caseRecord.evidenceSummary
            )
        ) {
            missingRequirements.push(
                "Evidence summary"
            );
        }

        if (
            !hasText(
                caseRecord.proposedAction
            )
        ) {
            missingRequirements.push(
                "Proposed action"
            );
        }

        if (
            !hasText(
                caseRecord.proposedResolution
            )
        ) {
            missingRequirements.push(
                "Resolution details"
            );
        }

        if (
            missingRequirements.length >
            0
        ) {
            return res.status(400).json({
                success: false,

                message:
                    "Investigation is incomplete. Complete all required items before submitting the case for Checker review.",

                missingRequirements,
            });
        }

        /*
         * Detect whether this is the first
         * submission or a resubmission after
         * the Checker previously returned it.
         */
        const previousReturnReason =
            caseRecord.checkerReturnReason;

        const isResubmission =
            Boolean(
                previousReturnReason ||
                    caseRecord.checkedAt
            );

        const previousStatus =
            caseRecord.status;

        caseRecord.status =
            "PENDING_CHECKER_APPROVAL";

        caseRecord.submittedBy =
            new mongoose.Types.ObjectId(
                makerId
            );

        caseRecord.submittedAt =
            new Date();

        /*
         * Fresh Checker review for every
         * submission / resubmission.
         */
        caseRecord.set(
            "checkerReview",
            {
                sourceDatasetVerified:
                    false,

                targetDatasetVerified:
                    false,

                rejectedRowsVerified:
                    false,

                transactionIdentifiersCompared:
                    false,

                rootCauseSupported:
                    false,

                actionSupported:
                    false,

                resolutionAppropriate:
                    false,
            }
        );

        caseRecord.set(
            "checkerReturnReason",
            null
        );

        caseRecord.checkerComment =
            "";

        caseRecord.checkedBy =
            null;

        caseRecord.checkedAt =
            null;

        caseRecord.resolvedAt =
            null;

        await caseRecord.save();

        await createBusinessAudit({
            actorId: makerId,

            actorRole:
                res.locals.user.role,

            entityType: "CASE",

            entityId:
                caseRecord._id.toString(),

            action: isResubmission
                ? "CASE_RESUBMITTED"
                : "CASE_SUBMITTED",

            description: isResubmission
                ? "Maker resubmitted the case for Checker review"
                : "Maker submitted the case for Checker review",

            metadata: {
                previousStatus,

                newStatus:
                    "PENDING_CHECKER_APPROVAL",

                originType:
                    caseOriginType,

                rejectedRowReviewRequired,

                requiredChecklistItems:
                    requiredChecks.map(
                        (item) =>
                            item.key
                    ),

                previousReturnReason:
                    previousReturnReason ||
                    null,
            },
        });

        return res.status(200).json({
            success: true,
            message:
                "Case submitted for Checker approval",
            data: caseRecord,
        });
    } catch (error) {
        if (
            error instanceof
            mongoose.Error.VersionError
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "This case changed while your request was being processed. Reload it before trying again",
            });
        }

        console.error(
            "Submit case error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to submit case",
        });
    }
};