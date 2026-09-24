import type {
    Request,
    Response,
} from "express";

import {
    Upload,
} from "../uploads/upload.model.js";

import {
    Transaction,
} from "../transactions/transaction.model.js";

import {
    Reconciliation,
} from "../reconciliation/reconciliation.model.js";

import {
    Exception,
} from "../exceptions/exception.model.js";

import {
    Case,
} from "../cases/case.model.js";

import {
    DataQualityIssue,
} from "../data-quality/data-quality.model.js";

import {
    DataCorrectionTask,
} from "../data-corrections/data-correction.model.js";

const toCountMap = (
    rows: {
        _id: string | null;
        count: number;
    }[]
) => {
    return rows.reduce<
        Record<string, number>
    >(
        (
            accumulator,
            row
        ) => {
            accumulator[
                row._id ||
                "UNKNOWN"
            ] = row.count;

            return accumulator;
        },
        {}
    );
};

export const getDashboardSummary =
    async (
        _req: Request,
        res: Response
    ) => {
        try {
            const [
                totalUploads,
                activeUploads,
                archivedUploads,
                totalTransactions,

                totalReconciliations,
                reconciliationStatuses,
                reconciliationSummary,
                recentReconciliations,

                totalExceptions,
                openExceptions,
                exceptionTypes,

                totalCases,
                caseStatuses,
                caseOrigins,
                recentCases,

                totalDataQualityIssues,
                dataQualityStatuses,
                dataQualityTypes,
                recentDataQualityIssues,

                totalCorrectionTasks,
                correctionStatuses,
            ] = await Promise.all([
                Upload.countDocuments(),

                Upload.countDocuments({
                    isArchived: {
                        $ne: true,
                    },
                }),

                Upload.countDocuments({
                    isArchived:
                        true,
                }),

                Transaction.countDocuments(),

                Reconciliation
                    .countDocuments(),

                Reconciliation
                    .aggregate([
                        {
                            $group: {
                                _id:
                                    "$status",

                                count: {
                                    $sum: 1,
                                },
                            },
                        },
                    ]),

                Reconciliation
                    .aggregate([
                        {
                            $group: {
                                _id: null,

                                totalProcessed: {
                                    $sum:
                                        "$totalTransactions",
                                },

                                matched: {
                                    $sum:
                                        "$matchedCount",
                                },

                                probable: {
                                    $sum:
                                        "$probableMatchCount",
                                },

                                unmatched: {
                                    $sum:
                                        "$unmatchedCount",
                                },

                                mismatches: {
                                    $sum:
                                        "$mismatchCount",
                                },
                            },
                        },
                    ]),

                Reconciliation.find()
                    .select(
                        "-__v"
                    )
                    .populate(
                        "sourceUploadId",
                        "originalName sourceSystem"
                    )
                    .populate(
                        "targetUploadId",
                        "originalName sourceSystem"
                    )
                    .populate(
                        "startedBy",
                        "name role"
                    )
                    .sort({
                        createdAt:
                            -1,
                    })
                    .limit(5)
                    .lean(),

                Exception
                    .countDocuments(),

                Exception
                    .countDocuments({
                        status: {
                            $ne:
                                "RESOLVED",
                        },
                    }),

                Exception
                    .aggregate([
                        {
                            $group: {
                                _id:
                                    "$exceptionType",

                                count: {
                                    $sum: 1,
                                },
                            },
                        },
                        {
                            $sort: {
                                count: -1,
                            },
                        },
                    ]),

                Case.countDocuments(),

                Case.aggregate([
                    {
                        $group: {
                            _id:
                                "$status",

                            count: {
                                $sum: 1,
                            },
                        },
                    },
                ]),

                Case.aggregate([
                    {
                        $group: {
                            _id: {
                                $ifNull: [
                                    "$originType",
                                    "RECONCILIATION_EXCEPTION",
                                ],
                            },

                            count: {
                                $sum: 1,
                            },
                        },
                    },
                ]),

                Case.find()
                    .select(
                        "originType priority status assignedTo createdAt"
                    )
                    .populate(
                        "assignedTo",
                        "name role"
                    )
                    .sort({
                        createdAt:
                            -1,
                    })
                    .limit(5)
                    .lean(),

                DataQualityIssue
                    .countDocuments(),

                DataQualityIssue
                    .aggregate([
                        {
                            $group: {
                                _id:
                                    "$status",

                                count: {
                                    $sum: 1,
                                },
                            },
                        },
                    ]),

                DataQualityIssue
                    .aggregate([
                        {
                            $group: {
                                _id:
                                    "$issueType",

                                count: {
                                    $sum: 1,
                                },
                            },
                        },
                        {
                            $sort: {
                                count: -1,
                            },
                        },
                    ]),

                DataQualityIssue
                    .find()
                    .select(
                        "issueType severity status keyValue sourceSystem uploadId caseId createdAt"
                    )
                    .populate(
                        "uploadId",
                        "originalName sourceSystem"
                    )
                    .sort({
                        createdAt:
                            -1,
                    })
                    .limit(5)
                    .lean(),

                DataCorrectionTask
                    .countDocuments(),

                DataCorrectionTask
                    .aggregate([
                        {
                            $group: {
                                _id:
                                    "$status",

                                count: {
                                    $sum: 1,
                                },
                            },
                        },
                    ]),
            ]);

            const reconciliationTotals =
                reconciliationSummary[0] || {
                    totalProcessed:
                        0,

                    matched:
                        0,

                    probable:
                        0,

                    unmatched:
                        0,

                    mismatches:
                        0,
                };

            const exactMatchRate =
                reconciliationTotals
                    .totalProcessed >
                0
                    ? Number(
                        (
                            (
                                reconciliationTotals
                                    .matched /
                                reconciliationTotals
                                    .totalProcessed
                            ) *
                            100
                        ).toFixed(
                            2
                        )
                    )
                    : 0;

            const caseStatusCounts =
                toCountMap(
                    caseStatuses as any
                );

            const dqStatusCounts =
                toCountMap(
                    dataQualityStatuses as any
                );

            const correctionStatusCounts =
                toCountMap(
                    correctionStatuses as any
                );

            const reconciliationStatusCounts =
                toCountMap(
                    reconciliationStatuses as any
                );

            const activeCases =
                Math.max(
                    totalCases -
                        (
                            caseStatusCounts
                                .RESOLVED ||
                            0
                        ) -
                        (
                            caseStatusCounts
                                .CLOSED ||
                            0
                        ),

                    0
                );

            const unresolvedDataQuality =
                Math.max(
                    totalDataQualityIssues -
                        (
                            dqStatusCounts
                                .VERIFIED_RESOLVED ||
                            0
                        ) -
                        (
                            dqStatusCounts
                                .RESOLVED ||
                            0
                        ),

                    0
                );

            const activeCorrections =
                (
                    correctionStatusCounts
                        .REQUESTED ||
                    0
                ) +
                (
                    correctionStatusCounts
                        .ASSIGNED ||
                    0
                ) +
                (
                    correctionStatusCounts
                        .IN_PROGRESS ||
                    0
                ) +
                (
                    correctionStatusCounts
                        .CORRECTED_UPLOAD_SUBMITTED ||
                    0
                );

            const verificationFailedCorrections =
                correctionStatusCounts
                    .VERIFICATION_FAILED ||
                0;

            const operationalAttention =
                {
                    openExceptions,

                    /*
                     * Do not add the broad activeCases total here.
                     * It already contains statuses such as APPROVED,
                     * PENDING_CHECKER_APPROVAL, and RETURNED_TO_MAKER,
                     * which are counted separately below. Including it
                     * would double-count the operational queue.
                     */
                    pendingCheckerApproval:
                        caseStatusCounts
                            .PENDING_CHECKER_APPROVAL ||
                        0,

                    returnedToMaker:
                        caseStatusCounts
                            .RETURNED_TO_MAKER ||
                        0,

                    approvedAwaitingResolution:
                        caseStatusCounts
                            .APPROVED ||
                        0,

                    unresolvedDataQuality,

                    activeCorrections,

                    verificationFailedCorrections,
                };

            const attentionTotal =
                Object.values(
                    operationalAttention
                ).reduce(
                    (
                        total,
                        value
                    ) =>
                        total +
                        Number(
                            value ||
                            0
                        ),

                    0
                );

            return res
                .status(200)
                .json({
                    success: true,

                    data: {
                        generatedAt:
                            new Date(),

                        overview: {
                            totalUploads,

                            activeUploads,

                            archivedUploads,

                            totalTransactions,

                            totalReconciliations,

                            completedReconciliations:
                                reconciliationStatusCounts
                                    .COMPLETED ||
                                0,

                            failedReconciliations:
                                reconciliationStatusCounts
                                    .FAILED ||
                                0,

                            totalExceptions,

                            openExceptions,

                            totalCases,

                            activeCases,

                            closedCases:
                                caseStatusCounts
                                    .CLOSED ||
                                0,

                            exactMatchRate,

                            totalDataQualityIssues,

                            unresolvedDataQuality,

                            verifiedResolvedDataQuality:
                                dqStatusCounts
                                    .VERIFIED_RESOLVED ||
                                0,

                            totalCorrectionTasks,

                            activeCorrections,

                            verifiedCorrections:
                                correctionStatusCounts
                                    .VERIFIED_RESOLVED ||
                                0,

                            verificationFailedCorrections,
                        },

                        reconciliation:
                            reconciliationTotals,

                        cases: {
                            byStatus:
                                caseStatusCounts,

                            byOrigin:
                                toCountMap(
                                    caseOrigins as any
                                ),

                            recent:
                                recentCases,
                        },

                        dataQuality: {
                            byStatus:
                                dqStatusCounts,

                            byType:
                                toCountMap(
                                    dataQualityTypes as any
                                ),

                            recent:
                                recentDataQualityIssues,
                        },

                        corrections: {
                            byStatus:
                                correctionStatusCounts,
                        },

                        exceptionTypes,

                        attention: {
                            ...operationalAttention,

                            total:
                                attentionTotal,
                        },

                        recentReconciliations,
                    },
                });
        } catch (error) {
            console.error(
                "Dashboard error:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,

                    message:
                        "Unable to load dashboard",
                });
        }
    };
