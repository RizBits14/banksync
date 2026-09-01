import type {
    Request,
    Response,
} from "express";

import { Upload } from "../uploads/upload.model.js";
import { Transaction } from "../transactions/transaction.model.js";
import { Reconciliation } from "../reconciliation/reconciliation.model.js";
import { Exception } from "../exceptions/exception.model.js";
import { Case } from "../cases/case.model.js";

export const getDashboardSummary =
    async (
        _req: Request,
        res: Response
    ) => {
        try {
            const [
                totalUploads,
                totalTransactions,
                totalReconciliations,
                totalExceptions,
                openExceptions,
                totalCases,
                caseStatuses,
                exceptionTypes,
                transactionsBySource,
                reconciliationSummary,
                recentReconciliations,
            ] = await Promise.all([
                Upload.countDocuments(),

                Transaction.countDocuments(),

                Reconciliation.countDocuments(),

                Exception.countDocuments(),

                Exception.countDocuments({
                    status: {
                        $ne: "RESOLVED",
                    },
                }),

                Case.countDocuments(),

                Case.aggregate([
                    {
                        $group: {
                            _id: "$status",
                            count: {
                                $sum: 1,
                            },
                        },
                    },
                ]),

                Exception.aggregate([
                    {
                        $group: {
                            _id: "$exceptionType",
                            count: {
                                $sum: 1,
                            },
                        },
                    },
                ]),

                Transaction.aggregate([
                    {
                        $group: {
                            _id: "$sourceSystem",
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

                Reconciliation.aggregate([
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
                    .select("-__v")
                    .sort({
                        createdAt: -1,
                    })
                    .limit(5)
                    .lean(),
            ]);

            const reconciliationTotals =
                reconciliationSummary[0] || {
                    totalProcessed: 0,
                    matched: 0,
                    probable: 0,
                    unmatched: 0,
                    mismatches: 0,
                };

            const exactMatchRate =
                reconciliationTotals
                    .totalProcessed > 0
                    ? Number(
                        (
                            (reconciliationTotals.matched /
                                reconciliationTotals.totalProcessed) *
                            100
                        ).toFixed(2)
                    )
                    : 0;

            return res.status(200).json({
                success: true,

                data: {
                    overview: {
                        totalUploads,
                        totalTransactions,
                        totalReconciliations,
                        totalExceptions,
                        openExceptions,
                        totalCases,
                        exactMatchRate,
                    },

                    reconciliation:
                        reconciliationTotals,

                    cases: caseStatuses,

                    exceptionTypes,

                    transactionsBySource,

                    recentReconciliations,
                },
            });
        } catch (error) {
            console.error(
                "Dashboard error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to load dashboard",
            });
        }
    };