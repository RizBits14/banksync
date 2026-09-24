import mongoose from "mongoose";
import type {
    Request,
    Response,
} from "express";

import {
    Case,
    CHECKER_RETURN_REASONS,
} from "./case.model.js";

import {
    saveCaseAndException,
} from "./case.persistence.js";

import {
    createBusinessAudit,
} from "../audit/audit.service.js";

type CheckerReviewInput = {
    sourceDatasetVerified?: boolean;
    targetDatasetVerified?: boolean;
    rejectedRowsVerified?: boolean;
    transactionIdentifiersCompared?: boolean;
    rootCauseSupported?: boolean;
    actionSupported?: boolean;
    resolutionAppropriate?: boolean;
};

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

const normalizeComment = (
    value: unknown
): string => {
    if (typeof value !== "string") {
        return "";
    }

    return value.trim();
};

const normalizeCheckerReview = (
    value: unknown
) => {
    const review =
        value &&
            typeof value === "object"
            ? (value as CheckerReviewInput)
            : {};

    return {
        sourceDatasetVerified:
            review.sourceDatasetVerified ===
            true,

        targetDatasetVerified:
            review.targetDatasetVerified ===
            true,

        rejectedRowsVerified:
            review.rejectedRowsVerified ===
            true,

        transactionIdentifiersCompared:
            review.transactionIdentifiersCompared ===
            true,

        rootCauseSupported:
            review.rootCauseSupported ===
            true,

        actionSupported:
            review.actionSupported ===
            true,

        resolutionAppropriate:
            review.resolutionAppropriate ===
            true,
    };
};

const isValidReturnReason = (
    value: unknown
): value is
    (typeof CHECKER_RETURN_REASONS)[number] => {
    return (
        typeof value === "string" &&
        (
            CHECKER_RETURN_REASONS as readonly string[]
        ).includes(value)
    );
};

const rejectedRowsExistForCase = async (
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
                            select:
                                "invalidRows",
                        },
                        {
                            path: "targetUploadId",
                            select:
                                "invalidRows",
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

    const originType =
        caseContext.originType ||
        (caseContext.dataQualityIssueId
            ? "DATA_QUALITY_ISSUE"
            : "RECONCILIATION_EXCEPTION");

    /*
     * DATA QUALITY CASE
     *
     * Only the original uploaded banking
     * dataset exists at this stage.
     */
    if (
        originType ===
        "DATA_QUALITY_ISSUE"
    ) {
        const originalUpload =
            caseContext.originalUploadId as any;

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
     * Preserve the existing rule:
     * rejected rows on either side require
     * independent Checker verification.
     */
    const exception =
        caseContext.exceptionId as any;

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

export const approveCase = async (
    req: Request,
    res: Response
) => {
    try {
        const id =
            getSingleParam(
                req.params.id
            );

        const checkerId =
            res.locals.user?.userId;

        const checkerRole =
            res.locals.user?.role;

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

        if (
            !checkerId ||
            !mongoose.isValidObjectId(
                checkerId
            )
        ) {
            return res.status(401).json({
                success: false,
                message:
                    "Authenticated Checker not found",
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
            caseRecord.status !==
            "PENDING_CHECKER_APPROVAL"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Case is not waiting for Checker approval",
            });
        }

        if (
            caseRecord.submittedBy
                ?.toString() ===
            checkerId ||
            caseRecord.assignedTo
                ?.toString() ===
            checkerId
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "You cannot review a case you investigated or submitted",
            });
        }

        const checkerReview =
            normalizeCheckerReview(
                req.body?.checkerReview
            );

        const originType =
            caseRecord.originType ||
            (caseRecord.dataQualityIssueId
                ? "DATA_QUALITY_ISSUE"
                : "RECONCILIATION_EXCEPTION");

        const isDataQualityCase =
            originType ===
            "DATA_QUALITY_ISSUE";

        const missingRequirements: string[] =
            [];

        /*
         * ----------------------------------------
         * ORIGIN-AWARE CHECKER REQUIREMENTS
         * ----------------------------------------
         *
         * RECONCILIATION_EXCEPTION
         * → independently verify both source
         *   and target reconciliation datasets.
         *
         * DATA_QUALITY_ISSUE
         * → independently verify the original
         *   uploaded banking dataset and the
         *   affected data-integrity evidence.
         *
         * A Data Quality case must NOT invent
         * a target dataset before reconciliation.
         */
        if (
            !checkerReview
                .sourceDatasetVerified
        ) {
            missingRequirements.push(
                isDataQualityCase
                    ? "Original uploaded dataset independently verified"
                    : "Source dataset independently verified"
            );
        }

        if (
            !isDataQualityCase &&
            !checkerReview
                .targetDatasetVerified
        ) {
            missingRequirements.push(
                "Target dataset independently verified"
            );
        }

        const rejectedRowsRequired =
            await rejectedRowsExistForCase(
                id
            );

        if (
            rejectedRowsRequired &&
            !checkerReview
                .rejectedRowsVerified
        ) {
            missingRequirements.push(
                "Rejected rows independently verified"
            );
        }

        if (
            !checkerReview
                .transactionIdentifiersCompared
        ) {
            missingRequirements.push(
                isDataQualityCase
                    ? "Affected records and detected defect independently verified"
                    : "Transaction identifiers independently compared"
            );
        }

        if (
            !checkerReview
                .rootCauseSupported
        ) {
            missingRequirements.push(
                "Maker root cause supported by evidence"
            );
        }

        if (
            !checkerReview
                .actionSupported
        ) {
            missingRequirements.push(
                isDataQualityCase
                    ? "Maker remediation recommendation supported by evidence"
                    : "Proposed action supported by evidence"
            );
        }

        if (
            !checkerReview
                .resolutionAppropriate
        ) {
            missingRequirements.push(
                isDataQualityCase
                    ? "Recommended remediation operationally appropriate"
                    : "Resolution operationally appropriate"
            );
        }

        if (
            missingRequirements.length >
            0
        ) {
            return res.status(400).json({
                success: false,

                message:
                    "Complete all required independent Checker verification before approval.",

                missingRequirements,
            });
        }

        const previousStatus =
            caseRecord.status;

        const now =
            new Date();

        caseRecord.set(
            "checkerReview",
            checkerReview
        );

        caseRecord.set(
            "checkerReturnReason",
            null
        );

        caseRecord.checkerComment =
            normalizeComment(
                req.body?.checkerComment
            );

        caseRecord.checkedBy =
            new mongoose.Types.ObjectId(
                checkerId
            );

        caseRecord.checkedAt =
            now;

        caseRecord.status =
            "APPROVED";

        caseRecord.resolvedAt =
            null;

        caseRecord.resolvedBy =
            null;

        caseRecord.resolutionExecutionNote =
            "";

        await saveCaseAndException(
            caseRecord
        );

        await createBusinessAudit({
            actorId:
                checkerId,

            actorRole:
                checkerRole,

            entityType:
                "CASE",

            entityId:
                caseRecord._id.toString(),

            action:
                "CASE_APPROVED",

            description:
                isDataQualityCase
                    ? "Checker independently verified and approved the Data Quality investigation"
                    : "Checker independently verified and approved the reconciliation case",

            metadata: {
                previousStatus,

                newStatus:
                    "APPROVED",

                originType,

                rejectedRowsVerificationRequired:
                    rejectedRowsRequired,

                checkerReview,

                dataQualityIssueResolved:
                    false,
            },
        });

        return res.status(200).json({
            success: true,
            message:
                "Case approved successfully",
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
            "Approve case error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to approve case",
        });
    }
};

export const returnCaseToMaker =
    async (
        req: Request,
        res: Response
    ) => {
        try {
            const id =
                getSingleParam(
                    req.params.id
                );

            const checkerId =
                res.locals.user?.userId;

            const checkerRole =
                res.locals.user?.role;

            const checkerComment =
                normalizeComment(
                    req.body
                        ?.checkerComment
                );

            const checkerReturnReason =
                req.body
                    ?.checkerReturnReason;

            const checkerReview =
                normalizeCheckerReview(
                    req.body
                        ?.checkerReview
                );

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
                !isValidReturnReason(
                    checkerReturnReason
                )
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "A valid return reason is required",
                    });
            }

            if (
                checkerComment.length <
                3
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Explain what the Maker must correct before returning the case",
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
                caseRecord.status !==
                "PENDING_CHECKER_APPROVAL"
            ) {
                return res
                    .status(409)
                    .json({
                        success: false,
                        message:
                            "Case is not waiting for Checker review",
                    });
            }

            if (
                caseRecord.submittedBy
                    ?.toString() ===
                checkerId ||
                caseRecord.assignedTo
                    ?.toString() ===
                checkerId
            ) {
                return res
                    .status(403)
                    .json({
                        success: false,
                        message:
                            "You cannot review a case you investigated or submitted",
                    });
            }

            const previousStatus =
                caseRecord.status;

            const now =
                new Date();

            caseRecord.set(
                "checkerReview",
                checkerReview
            );

            caseRecord.set(
                "checkerReturnReason",
                checkerReturnReason
            );

            caseRecord.checkerComment =
                checkerComment;

            caseRecord.checkedBy =
                new mongoose.Types.ObjectId(
                    checkerId
                );

            caseRecord.checkedAt =
                now;

            caseRecord.status =
                "RETURNED_TO_MAKER";

            caseRecord.resolvedAt =
                null;

            await saveCaseAndException(
                caseRecord
            );

            await createBusinessAudit({
                actorId:
                    checkerId,

                actorRole:
                    checkerRole,

                entityType:
                    "CASE",

                entityId:
                    caseRecord._id.toString(),

                action:
                    "CASE_RETURNED",

                description:
                    caseRecord.originType ===
                        "DATA_QUALITY_ISSUE"
                        ? "Checker returned the Data Quality investigation to the Maker with findings"
                        : "Checker returned the reconciliation case to the Maker with findings",

                metadata: {
                    previousStatus,

                    newStatus:
                        "RETURNED_TO_MAKER",

                    originType:
                        caseRecord.originType ||
                        (caseRecord.dataQualityIssueId
                            ? "DATA_QUALITY_ISSUE"
                            : "RECONCILIATION_EXCEPTION"),

                    returnReason:
                        checkerReturnReason,

                    checkerReview,
                },
            });

            return res
                .status(200)
                .json({
                    success: true,
                    message:
                        "Case returned to Maker",
                    data: caseRecord,
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
                            "This case changed while your request was being processed. Reload it before trying again",
                    });
            }

            console.error(
                "Return case error:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,
                    message:
                        "Unable to return case",
                });
        }
    };