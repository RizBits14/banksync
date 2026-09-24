import mongoose from "mongoose";

import type {
    Request,
    Response,
} from "express";

import {
    Upload,
} from "../uploads/upload.model.js";

import {
    Reconciliation,
} from "../reconciliation/reconciliation.model.js";

import {
    ReconciliationResult,
} from "../reconciliation/reconciliation-result.model.js";

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

import {
    sendCsv,
    sendXlsx,
    type ReportRow,
} from "./report.helper.js";

/*
 * ----------------------------------------
 * GENERIC HELPERS
 * ----------------------------------------
 */

const getFormat = (
    req: Request
) => {
    const format =
        String(
            req.query.format || "csv"
        ).toLowerCase();

    if (
        format !== "csv" &&
        format !== "xlsx"
    ) {
        return null;
    }

    return format;
};

const sendReport = async (
    res: Response,
    format: "csv" | "xlsx",
    filename: string,
    sheetName: string,
    rows: ReportRow[]
) => {
    if (format === "xlsx") {
        return sendXlsx(
            res,
            filename,
            sheetName,
            rows
        );
    }

    return sendCsv(
        res,
        filename,
        rows
    );
};

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
            const key =
                row._id ||
                "UNKNOWN";

            accumulator[key] =
                row.count;

            return accumulator;
        },
        {}
    );
};

const formatDate = (
    value: unknown
) => {
    if (!value) {
        return "";
    }

    const date =
        new Date(
            value as string | number | Date
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "";
    }

    return date.toISOString();
};

/*
 * ========================================
 * REPORTS OVERVIEW
 * ========================================
 *
 * This endpoint powers the BankSync Reports
 * page. It deliberately summarizes the real
 * reconciliation-control workflow:
 *
 * Upload
 *   ↓
 * Data Quality
 *   ↓
 * Reconciliation
 *   ↓
 * Exception / Case
 *   ↓
 * Correction
 *   ↓
 * Resolution / Closure
 */
export const getReportsSummary =
    async (
        _req: Request,
        res: Response
    ) => {
        try {
            const [
                uploadTotal,
                uploadActive,
                uploadArchived,
                uploadStatusGroups,
                uploadSourceGroups,

                reconciliationTotal,
                reconciliationStatusGroups,
                reconciliationTotals,

                exceptionTotal,
                exceptionStatusGroups,
                exceptionTypeGroups,

                caseTotal,
                caseStatusGroups,
                caseOriginGroups,
                casePriorityGroups,

                dqTotal,
                dqStatusGroups,
                dqTypeGroups,
                dqSeverityGroups,

                correctionTotal,
                correctionStatusGroups,
            ] =
                await Promise.all([
                    Upload.countDocuments(),

                    /*
                     * Older Upload documents may not contain
                     * isArchived at all. In BankSync, anything
                     * that is not explicitly archived should be
                     * treated as non-archived for reporting.
                     */
                    Upload.countDocuments({
                        isArchived: {
                            $ne: true,
                        },
                    }),

                    Upload.countDocuments({
                        isArchived:
                            true,
                    }),

                    Upload.aggregate([
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

                    Upload.aggregate([
                        {
                            $group: {
                                _id:
                                    "$sourceSystem",

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

                    Reconciliation
                        .countDocuments(),

                    Reconciliation.aggregate([
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

                    Reconciliation.aggregate([
                        {
                            $group: {
                                _id: null,

                                totalTransactions: {
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

                                mismatched: {
                                    $sum:
                                        "$mismatchCount",
                                },
                            },
                        },
                    ]),

                    Exception.countDocuments(),

                    Exception.aggregate([
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

                    Exception.aggregate([
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

                    Case.aggregate([
                        {
                            $group: {
                                _id:
                                    "$priority",

                                count: {
                                    $sum: 1,
                                },
                            },
                        },
                    ]),

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
                        .aggregate([
                            {
                                $group: {
                                    _id:
                                        "$severity",

                                    count: {
                                        $sum: 1,
                                    },
                                },
                            },
                        ]),

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

            const reconciliationSummary =
                reconciliationTotals[0] || {
                    totalTransactions:
                        0,

                    matched:
                        0,

                    probable:
                        0,

                    unmatched:
                        0,

                    mismatched:
                        0,
                };

            const caseStatusCounts =
                toCountMap(
                    caseStatusGroups as any
                );

            const dqStatusCounts =
                toCountMap(
                    dqStatusGroups as any
                );

            const correctionStatusCounts =
                toCountMap(
                    correctionStatusGroups as any
                );

            return res
                .status(200)
                .json({
                    success: true,

                    data: {
                        generatedAt:
                            new Date(),

                        uploads: {
                            total:
                                uploadTotal,

                            active:
                                uploadActive,

                            archived:
                                uploadArchived,

                            byStatus:
                                toCountMap(
                                    uploadStatusGroups as any
                                ),

                            bySourceSystem:
                                toCountMap(
                                    uploadSourceGroups as any
                                ),
                        },

                        reconciliations: {
                            total:
                                reconciliationTotal,

                            byStatus:
                                toCountMap(
                                    reconciliationStatusGroups as any
                                ),

                            transactionOutcomes: {
                                total:
                                    Number(
                                        reconciliationSummary
                                            .totalTransactions ||
                                            0
                                    ),

                                matched:
                                    Number(
                                        reconciliationSummary
                                            .matched ||
                                            0
                                    ),

                                probable:
                                    Number(
                                        reconciliationSummary
                                            .probable ||
                                            0
                                    ),

                                unmatched:
                                    Number(
                                        reconciliationSummary
                                            .unmatched ||
                                            0
                                    ),

                                mismatched:
                                    Number(
                                        reconciliationSummary
                                            .mismatched ||
                                            0
                                    ),
                            },
                        },

                        exceptions: {
                            total:
                                exceptionTotal,

                            byStatus:
                                toCountMap(
                                    exceptionStatusGroups as any
                                ),

                            byType:
                                toCountMap(
                                    exceptionTypeGroups as any
                                ),
                        },

                        cases: {
                            total:
                                caseTotal,

                            closed:
                                caseStatusCounts
                                    .CLOSED ||
                                0,

                            resolved:
                                caseStatusCounts
                                    .RESOLVED ||
                                0,

                            active:
                                Math.max(
                                    caseTotal -
                                        (caseStatusCounts
                                            .CLOSED ||
                                            0) -
                                        (caseStatusCounts
                                            .RESOLVED ||
                                            0),

                                    0
                                ),

                            byStatus:
                                caseStatusCounts,

                            byOrigin:
                                toCountMap(
                                    caseOriginGroups as any
                                ),

                            byPriority:
                                toCountMap(
                                    casePriorityGroups as any
                                ),
                        },

                        dataQuality: {
                            total:
                                dqTotal,

                            verifiedResolved:
                                dqStatusCounts
                                    .VERIFIED_RESOLVED ||
                                0,

                            unresolved:
                                Math.max(
                                    dqTotal -
                                        (dqStatusCounts
                                            .VERIFIED_RESOLVED ||
                                            0) -
                                        (dqStatusCounts
                                            .RESOLVED ||
                                            0),

                                    0
                                ),

                            byStatus:
                                dqStatusCounts,

                            byType:
                                toCountMap(
                                    dqTypeGroups as any
                                ),

                            bySeverity:
                                toCountMap(
                                    dqSeverityGroups as any
                                ),
                        },

                        corrections: {
                            total:
                                correctionTotal,

                            verifiedResolved:
                                correctionStatusCounts
                                    .VERIFIED_RESOLVED ||
                                0,

                            verificationFailed:
                                correctionStatusCounts
                                    .VERIFICATION_FAILED ||
                                0,

                            active:
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
                                ),

                            byStatus:
                                correctionStatusCounts,
                        },
                    },
                });
        } catch (error) {
            console.error(
                "Reports summary error:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,

                    message:
                        "Unable to load reports summary",
                });
        }
    };

/*
 * ========================================
 * RECONCILIATION EXPORT
 * ========================================
 */
export const exportReconciliationReport =
    async (
        req: Request,
        res: Response
    ) => {
        try {
            const { id } =
                req.params;

            const format =
                getFormat(req);

            if (!format) {
                return res
                    .status(400)
                    .json({
                        success: false,

                        message:
                            "Format must be csv or xlsx",
                    });
            }

            if (
                !mongoose
                    .isValidObjectId(
                        id
                    )
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,

                        message:
                            "Invalid reconciliation ID",
                    });
            }

            const reconciliation =
                await Reconciliation
                    .findById(
                        id
                    );

            if (!reconciliation) {
                return res
                    .status(404)
                    .json({
                        success: false,

                        message:
                            "Reconciliation not found",
                    });
            }

            const results =
                (
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
                        .lean()
                ) as any[];

            const rows:
                ReportRow[] =
                results.map(
                    (
                        result
                    ) => {
                        const source =
                            result
                                .sourceTransactionId;

                        const target =
                            result
                                .targetTransactionId;

                        return {
                            resultId:
                                String(
                                    result._id
                                ),

                            reconciliationId:
                                String(
                                    id
                                ),

                            result:
                                result.result,

                            matchScore:
                                result.matchScore ??
                                "",

                            sourceTransactionId:
                                source
                                    ?.transactionId ||
                                "",

                            sourceSystem:
                                source
                                    ?.sourceSystem ||
                                "",

                            sourceReference:
                                source
                                    ?.referenceNumber ||
                                "",

                            sourceAccount:
                                source
                                    ?.accountNumber ||
                                "",

                            sourceAmount:
                                source
                                    ?.amount
                                    ?.toString?.() ||
                                "",

                            sourceDate:
                                formatDate(
                                    source
                                        ?.transactionDate
                                ),

                            sourceStatus:
                                source
                                    ?.status ||
                                "",

                            targetTransactionId:
                                target
                                    ?.transactionId ||
                                "",

                            targetSystem:
                                target
                                    ?.sourceSystem ||
                                "",

                            targetReference:
                                target
                                    ?.referenceNumber ||
                                "",

                            targetAccount:
                                target
                                    ?.accountNumber ||
                                "",

                            targetAmount:
                                target
                                    ?.amount
                                    ?.toString?.() ||
                                "",

                            targetDate:
                                formatDate(
                                    target
                                        ?.transactionDate
                                ),

                            targetStatus:
                                target
                                    ?.status ||
                                "",
                        };
                    }
                );

            return sendReport(
                res,
                format,
                `reconciliation-${id}`,
                "Reconciliation",
                rows
            );
        } catch (error) {
            console.error(
                "Reconciliation report error:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,

                    message:
                        "Unable to export reconciliation report",
                });
        }
    };

/*
 * ========================================
 * EXCEPTIONS EXPORT
 * ========================================
 */
export const exportExceptionsReport =
    async (
        req: Request,
        res: Response
    ) => {
        try {
            const format =
                getFormat(req);

            if (!format) {
                return res
                    .status(400)
                    .json({
                        success: false,

                        message:
                            "Format must be csv or xlsx",
                    });
            }

            const exceptions =
                (
                    await Exception
                        .find()
                        .populate(
                            "transactionId"
                        )
                        .sort({
                            createdAt:
                                -1,
                        })
                        .lean()
                ) as any[];

            const rows:
                ReportRow[] =
                exceptions.map(
                    (
                        exception
                    ) => ({
                        exceptionId:
                            String(
                                exception._id
                            ),

                        reconciliationId:
                            String(
                                exception
                                    .reconciliationId ||
                                ""
                            ),

                        transactionId:
                            exception
                                .transactionId
                                ?.transactionId ||
                            "",

                        sourceSystem:
                            exception
                                .transactionId
                                ?.sourceSystem ||
                            "",

                        exceptionType:
                            exception
                                .exceptionType,

                        score:
                            exception
                                .score ??
                            "",

                        reasons:
                            Array
                                .isArray(
                                    exception
                                        .reasons
                                )
                                ? exception
                                    .reasons
                                    .join(
                                        "; "
                                    )
                                : "",

                        status:
                            exception
                                .status,

                        createdAt:
                            formatDate(
                                exception
                                    .createdAt
                            ),
                    })
                );

            return sendReport(
                res,
                format,
                "exceptions-report",
                "Exceptions",
                rows
            );
        } catch (error) {
            console.error(
                "Exceptions report error:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,

                    message:
                        "Unable to export exceptions report",
                });
        }
    };

/*
 * ========================================
 * CASES EXPORT - ORIGIN AWARE
 * ========================================
 */
export const exportCasesReport =
    async (
        req: Request,
        res: Response
    ) => {
        try {
            const format =
                getFormat(req);

            if (!format) {
                return res
                    .status(400)
                    .json({
                        success: false,

                        message:
                            "Format must be csv or xlsx",
                    });
            }

            const cases =
                (
                    await Case
                        .find()
                        .populate(
                            "exceptionId"
                        )
                        .populate({
                            path:
                                "dataQualityIssueId",

                            select:
                                "issueType severity status keyValue sourceSystem",
                        })
                        .populate(
                            "assignedTo",
                            "name email"
                        )
                        .populate(
                            "submittedBy",
                            "name email"
                        )
                        .populate(
                            "checkedBy",
                            "name email"
                        )
                        .sort({
                            createdAt:
                                -1,
                        })
                        .lean()
                ) as any[];

            const rows:
                ReportRow[] =
                cases.map(
                    (
                        caseRecord
                    ) => {
                        const originType =
                            caseRecord
                                .originType ||
                            (
                                caseRecord
                                    .dataQualityIssueId
                                    ? "DATA_QUALITY_ISSUE"
                                    : "RECONCILIATION_EXCEPTION"
                            );

                        return {
                            caseId:
                                String(
                                    caseRecord._id
                                ),

                            originType,

                            priority:
                                caseRecord
                                    .priority,

                            status:
                                caseRecord
                                    .status,

                            exceptionId:
                                String(
                                    caseRecord
                                        .exceptionId
                                        ?._id ||
                                    ""
                                ),

                            exceptionType:
                                caseRecord
                                    .exceptionId
                                    ?.exceptionType ||
                                "",

                            exceptionScore:
                                caseRecord
                                    .exceptionId
                                    ?.score ??
                                "",

                            dataQualityIssueId:
                                String(
                                    caseRecord
                                        .dataQualityIssueId
                                        ?._id ||
                                    ""
                                ),

                            dataQualityIssueType:
                                caseRecord
                                    .dataQualityIssueId
                                    ?.issueType ||
                                "",

                            dataQualitySeverity:
                                caseRecord
                                    .dataQualityIssueId
                                    ?.severity ||
                                "",

                            dataQualityKey:
                                caseRecord
                                    .dataQualityIssueId
                                    ?.keyValue ||
                                "",

                            sourceSystem:
                                caseRecord
                                    .dataQualityIssueId
                                    ?.sourceSystem ||
                                "",

                            assignedTo:
                                caseRecord
                                    .assignedTo
                                    ?.name ||
                                "",

                            rootCauseCategory:
                                caseRecord
                                    .rootCauseCategory ||
                                "",

                            investigationFindings:
                                caseRecord
                                    .investigationFindings ||
                                "",

                            investigationNotes:
                                caseRecord
                                    .investigationNotes ||
                                "",

                            proposedAction:
                                caseRecord
                                    .proposedAction ||
                                "",

                            proposedResolution:
                                caseRecord
                                    .proposedResolution ||
                                "",

                            submittedBy:
                                caseRecord
                                    .submittedBy
                                    ?.name ||
                                "",

                            checkedBy:
                                caseRecord
                                    .checkedBy
                                    ?.name ||
                                "",

                            checkerComment:
                                caseRecord
                                    .checkerComment ||
                                "",

                            resolutionExecutionNote:
                                caseRecord
                                    .resolutionExecutionNote ||
                                "",

                            closureNote:
                                caseRecord
                                    .closureNote ||
                                "",

                            createdAt:
                                formatDate(
                                    caseRecord
                                        .createdAt
                                ),

                            updatedAt:
                                formatDate(
                                    caseRecord
                                        .updatedAt
                                ),
                        };
                    }
                );

            return sendReport(
                res,
                format,
                "cases-report",
                "Cases",
                rows
            );
        } catch (error) {
            console.error(
                "Cases report error:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,

                    message:
                        "Unable to export cases report",
                });
        }
    };

/*
 * ========================================
 * DATA QUALITY EXPORT
 * ========================================
 */
export const exportDataQualityReport =
    async (
        req: Request,
        res: Response
    ) => {
        try {
            const format =
                getFormat(req);

            if (!format) {
                return res
                    .status(400)
                    .json({
                        success: false,

                        message:
                            "Format must be csv or xlsx",
                    });
            }

            const issues =
                (
                    await DataQualityIssue
                        .find()
                        .populate({
                            path:
                                "uploadId",

                            select:
                                "originalName sourceSystem status totalRows validRows invalidRows",
                        })
                        .populate({
                            path:
                                "verificationUploadId",

                            select:
                                "originalName sourceSystem status totalRows validRows invalidRows",
                        })
                        .populate({
                            path:
                                "caseId",

                            select:
                                "_id status priority",
                        })
                        .sort({
                            createdAt:
                                -1,
                        })
                        .lean()
                ) as any[];

            const rows:
                ReportRow[] =
                issues.map(
                    (
                        issue
                    ) => ({
                        issueId:
                            String(
                                issue._id
                            ),

                        issueType:
                            issue
                                .issueType,

                        severity:
                            issue
                                .severity,

                        status:
                            issue
                                .status,

                        sourceSystem:
                            issue
                                .sourceSystem ||
                            "",

                        detectedKey:
                            issue
                                .keyValue ||
                            "",

                        description:
                            issue
                                .description ||
                            "",

                        originalUpload:
                            issue
                                .uploadId
                                ?.originalName ||
                            "",

                        originalUploadStatus:
                            issue
                                .uploadId
                                ?.status ||
                            "",

                        caseId:
                            String(
                                issue
                                    .caseId
                                    ?._id ||
                                ""
                            ),

                        caseStatus:
                            issue
                                .caseId
                                ?.status ||
                            "",

                        verificationUpload:
                            issue
                                .verificationUploadId
                                ?.originalName ||
                            "",

                        verificationUploadStatus:
                            issue
                                .verificationUploadId
                                ?.status ||
                            "",

                        verificationAttemptedAt:
                            formatDate(
                                issue
                                    .verificationAttemptedAt
                            ),

                        verifiedResolvedAt:
                            formatDate(
                                issue
                                    .verifiedResolvedAt
                            ),

                        createdAt:
                            formatDate(
                                issue
                                    .createdAt
                            ),
                    })
                );

            return sendReport(
                res,
                format,
                "data-quality-report",
                "Data Quality",
                rows
            );
        } catch (error) {
            console.error(
                "Data Quality report error:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,

                    message:
                        "Unable to export Data Quality report",
                });
        }
    };

/*
 * ========================================
 * DATA CORRECTIONS EXPORT
 * ========================================
 */
export const exportDataCorrectionsReport =
    async (
        req: Request,
        res: Response
    ) => {
        try {
            const format =
                getFormat(req);

            if (!format) {
                return res
                    .status(400)
                    .json({
                        success: false,

                        message:
                            "Format must be csv or xlsx",
                    });
            }

            const tasks =
                (
                    await DataCorrectionTask
                        .find()
                        .populate({
                            path:
                                "caseId",

                            select:
                                "_id status priority",
                        })
                        .populate({
                            path:
                                "dataQualityIssueId",

                            select:
                                "_id issueType severity status keyValue sourceSystem",
                        })
                        .populate({
                            path:
                                "originalUploadId",

                            select:
                                "originalName sourceSystem status",
                        })
                        .populate({
                            path:
                                "correctedUploadId",

                            select:
                                "originalName sourceSystem status",
                        })
                        .populate(
                            "requestedBy",
                            "name email role"
                        )
                        .populate(
                            "assignedTo",
                            "name email role"
                        )
                        .populate(
                            "submittedBy",
                            "name email role"
                        )
                        .sort({
                            createdAt:
                                -1,
                        })
                        .lean()
                ) as any[];

            const rows:
                ReportRow[] =
                tasks.map(
                    (
                        task
                    ) => ({
                        correctionTaskId:
                            String(
                                task._id
                            ),

                        caseId:
                            String(
                                task
                                    .caseId
                                    ?._id ||
                                ""
                            ),

                        caseStatus:
                            task
                                .caseId
                                ?.status ||
                            "",

                        issueId:
                            String(
                                task
                                    .dataQualityIssueId
                                    ?._id ||
                                ""
                            ),

                        issueType:
                            task
                                .dataQualityIssueId
                                ?.issueType ||
                            "",

                        issueSeverity:
                            task
                                .dataQualityIssueId
                                ?.severity ||
                            "",

                        issueStatus:
                            task
                                .dataQualityIssueId
                                ?.status ||
                            "",

                        detectedKey:
                            task
                                .dataQualityIssueId
                                ?.keyValue ||
                            "",

                        status:
                            task
                                .status,

                        originalUpload:
                            task
                                .originalUploadId
                                ?.originalName ||
                            "",

                        correctedUpload:
                            task
                                .correctedUploadId
                                ?.originalName ||
                            "",

                        requestedBy:
                            task
                                .requestedBy
                                ?.name ||
                            "",

                        assignedTo:
                            task
                                .assignedTo
                                ?.name ||
                            "",

                        submittedBy:
                            task
                                .submittedBy
                                ?.name ||
                            "",

                        checkerInstruction:
                            task
                                .checkerInstruction ||
                            "",

                        importOfficerNote:
                            task
                                .importOfficerNote ||
                            "",

                        verificationFailureReason:
                            task
                                .verificationFailureReason ||
                            "",

                        requestedAt:
                            formatDate(
                                task
                                    .requestedAt
                            ),

                        assignedAt:
                            formatDate(
                                task
                                    .assignedAt
                            ),

                        startedAt:
                            formatDate(
                                task
                                    .startedAt
                            ),

                        submittedAt:
                            formatDate(
                                task
                                    .submittedAt
                            ),

                        verifiedAt:
                            formatDate(
                                task
                                    .verifiedAt
                            ),

                        createdAt:
                            formatDate(
                                task
                                    .createdAt
                            ),
                    })
                );

            return sendReport(
                res,
                format,
                "data-corrections-report",
                "Data Corrections",
                rows
            );
        } catch (error) {
            console.error(
                "Data Corrections report error:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,

                    message:
                        "Unable to export Data Corrections report",
                });
        }
    };
