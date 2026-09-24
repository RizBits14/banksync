import type {
    Request,
    Response,
} from "express";

import mongoose from "mongoose";

import { Case } from "./case.model.js";
import { Transaction } from "../transactions/transaction.model.js";
import { UploadRejectedRow } from "../uploads/upload.rejection.model.js";

export const getCaseDataset = async (
    req: Request,
    res: Response
) => {
    try {
        const idParam =
            req.params.id;

        const sideParam =
            req.params.side;

        const id =
            Array.isArray(idParam)
                ? idParam[0]
                : idParam;

        const side =
            Array.isArray(sideParam)
                ? sideParam[0]
                : sideParam;

        const currentUser =
            res.locals.user;

        /*
         * ----------------------------------------
         * VALIDATE CASE ID
         * ----------------------------------------
         */
        if (
            !id ||
            !mongoose.isValidObjectId(id)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid case ID",
            });
        }

        /*
         * ----------------------------------------
         * VALIDATE DATASET SIDE
         * ----------------------------------------
         *
         * Reconciliation cases:
         * - source
         * - target
         *
         * Data Quality cases:
         * - original
         */
        if (
            side !== "source" &&
            side !== "target" &&
            side !== "original"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Dataset side must be source, target, or original",
            });
        }

        /*
         * ----------------------------------------
         * LOAD CASE ORIGIN + DATASET CONTEXT
         * ----------------------------------------
         */
        const caseRecord =
            await Case.findById(id)
                .select(
                    [
                        "originType",
                        "assignedTo",
                        "exceptionId",
                        "dataQualityIssueId",
                        "originalUploadId",
                        "status",
                    ].join(" ")
                )

                /*
                 * Normal reconciliation path:
                 *
                 * Case
                 *   ↓
                 * Exception
                 *   ↓
                 * Reconciliation
                 *   ↓
                 * Source / Target Upload
                 */
                .populate({
                    path:
                        "exceptionId",

                    select:
                        "reconciliationId",

                    populate: {
                        path:
                            "reconciliationId",

                        select:
                            "sourceUploadId targetUploadId",

                        populate: [
                            {
                                path:
                                    "sourceUploadId",

                                select:
                                    "originalName fileName sourceSystem status totalRows validRows invalidRows isArchived",
                            },

                            {
                                path:
                                    "targetUploadId",

                                select:
                                    "originalName fileName sourceSystem status totalRows validRows invalidRows isArchived",
                            },
                        ],
                    },
                })

                /*
                 * Data Quality path:
                 *
                 * Case
                 *   ↓
                 * Data Quality Issue
                 *   ↓
                 * Original Upload
                 *
                 * We also load the affected
                 * transaction references so the
                 * frontend can visually highlight
                 * them in the dataset inspector.
                 */
                .populate({
                    path:
                        "dataQualityIssueId",

                    select:
                        [
                            "issueType",
                            "severity",
                            "status",
                            "keyValue",
                            "description",
                            "sourceSystem",
                            "uploadId",
                            "primaryTransactionId",
                            "relatedTransactionIds",
                        ].join(" "),

                    populate: [
                        {
                            path:
                                "uploadId",

                            select:
                                "originalName fileName sourceSystem status totalRows validRows invalidRows isArchived",
                        },

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

                /*
                 * The Case keeps its own immutable
                 * pointer to the original upload.
                 */
                .populate(
                    "originalUploadId",

                    "originalName fileName sourceSystem status totalRows validRows invalidRows isArchived"
                );

        if (!caseRecord) {
            return res.status(404).json({
                success: false,
                message:
                    "Case not found",
            });
        }

        /*
         * ----------------------------------------
         * MAKER OWNERSHIP
         * ----------------------------------------
         *
         * Maker can inspect only a Case that is
         * assigned to them.
         */
        if (
            currentUser.role ===
                "MAKER" &&
            caseRecord.assignedTo?.toString() !==
                currentUser.userId
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "You are not assigned to this case",
            });
        }

        /*
         * ----------------------------------------
         * DETERMINE CASE ORIGIN
         * ----------------------------------------
         *
         * Older reconciliation Cases may not have
         * originType physically stored.
         */
        const originType =
            caseRecord.originType ||
            (caseRecord.dataQualityIssueId
                ? "DATA_QUALITY_ISSUE"
                : "RECONCILIATION_EXCEPTION");

        let upload: any = null;

        let datasetRole:
            | "SOURCE"
            | "TARGET"
            | "ORIGINAL" =
            "ORIGINAL";

        let affectedTransactionIds:
            string[] = [];

        let affectedTransactionKeys:
            string[] = [];

        let issueContext:
            | {
                  issueType?: string;
                  severity?: string;
                  status?: string;
                  keyValue?: string;
                  description?: string;
                  sourceSystem?: string;
              }
            | null = null;

        /*
         * ========================================
         * DATA QUALITY CASE
         * ========================================
         *
         * Data Quality is a pre-reconciliation
         * integrity control.
         *
         * There is no fake source-vs-target pair
         * here. The Maker investigates the actual
         * original uploaded banking dataset.
         */
        if (
            originType ===
            "DATA_QUALITY_ISSUE"
        ) {
            if (
                side !== "original"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Data Quality cases use the original uploaded dataset",
                });
            }

            const issue =
                caseRecord.dataQualityIssueId as any;

            /*
             * Prefer the Case's immutable original
             * upload reference.
             *
             * Fall back to the issue upload for
             * compatibility with older test records.
             */
            upload =
                caseRecord.originalUploadId ||
                issue?.uploadId;

            if (!upload) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Original upload was not found for this Data Quality case",
                });
            }

            datasetRole =
                "ORIGINAL";

            const primaryId =
                issue?.primaryTransactionId?._id?.toString?.();

            const relatedIds =
                Array.isArray(
                    issue?.relatedTransactionIds
                )
                    ? issue.relatedTransactionIds
                          .map(
                              (
                                  transaction: any
                              ) =>
                                  transaction?._id?.toString?.()
                          )
                          .filter(Boolean)
                    : [];

            affectedTransactionIds =
                Array.from(
                    new Set(
                        [
                            primaryId,
                            ...relatedIds,
                        ].filter(
                            (
                                value
                            ): value is string =>
                                Boolean(value)
                        )
                    )
                );

            /*
             * This second marker is useful when the
             * issue is duplicate-ID/reference based.
             *
             * It lets the frontend highlight all
             * matching rows even if one record was
             * not explicitly referenced.
             */
            if (
                typeof issue?.keyValue ===
                    "string" &&
                issue.keyValue.trim()
                    .length > 0
            ) {
                affectedTransactionKeys =
                    [
                        issue.keyValue.trim(),
                    ];
            }

            issueContext = {
                issueType:
                    issue?.issueType,

                severity:
                    issue?.severity,

                status:
                    issue?.status,

                keyValue:
                    issue?.keyValue,

                description:
                    issue?.description,

                sourceSystem:
                    issue?.sourceSystem,
            };
        }

        /*
         * ========================================
         * RECONCILIATION EXCEPTION CASE
         * ========================================
         */
        if (
            originType ===
            "RECONCILIATION_EXCEPTION"
        ) {
            if (
                side === "original"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Reconciliation cases use source or target datasets",
                });
            }

            const exception =
                caseRecord.exceptionId as any;

            const reconciliation =
                exception?.reconciliationId;

            if (!reconciliation) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Reconciliation information was not found for this case",
                });
            }

            upload =
                side === "source"
                    ? reconciliation
                          .sourceUploadId
                    : reconciliation
                          .targetUploadId;

            datasetRole =
                side === "source"
                    ? "SOURCE"
                    : "TARGET";

            if (!upload) {
                return res.status(404).json({
                    success: false,
                    message:
                        `${side} upload was not found`,
                });
            }
        }

        if (!upload) {
            return res.status(409).json({
                success: false,
                message:
                    "Unable to determine the dataset for this case",
            });
        }

        const uploadId =
            upload._id?.toString
                ? upload._id.toString()
                : String(upload);

        /*
         * ----------------------------------------
         * LOAD READ-ONLY DATASET EVIDENCE
         * ----------------------------------------
         *
         * BankSync does not modify source records
         * here. The Maker only investigates them.
         */
        const [
            transactions,
            rejectedRows,
        ] = await Promise.all([
            Transaction.find({
                uploadId,
            })
                .select(
                    [
                        "_id",
                        "uploadId",
                        "sourceSystem",
                        "transactionId",
                        "referenceNumber",
                        "accountNumber",
                        "amount",
                        "transactionDate",
                        "status",
                        "rawRecord",
                        "createdAt",
                    ].join(" ")
                )
                .sort({
                    transactionDate: 1,
                    createdAt: 1,
                })
                .lean(),

            UploadRejectedRow.find({
                uploadId,
            })
                .select(
                    [
                        "_id",
                        "uploadId",
                        "recordNumber",
                        "rawRecord",
                        "validationIssues",
                        "createdAt",
                    ].join(" ")
                )
                .sort({
                    recordNumber: 1,
                })
                .lean(),
        ]);

        /*
         * ----------------------------------------
         * RETURN DATASET + INVESTIGATION CONTEXT
         * ----------------------------------------
         */
        return res.status(200).json({
            success: true,

            data: {
                side,

                originType,

                datasetRole,

                readOnly: true,

                upload: {
                    _id:
                        upload._id,

                    originalName:
                        upload.originalName,

                    fileName:
                        upload.fileName,

                    sourceSystem:
                        upload.sourceSystem,

                    status:
                        upload.status,

                    totalRows:
                        upload.totalRows,

                    validRows:
                        upload.validRows,

                    invalidRows:
                        upload.invalidRows,

                    isArchived:
                        upload.isArchived,
                },

                /*
                 * Data Quality context is null for
                 * normal reconciliation cases.
                 */
                issueContext,

                /*
                 * Used by the frontend to highlight
                 * affected rows in Data Quality
                 * investigations.
                 */
                affectedTransactionIds,

                affectedTransactionKeys,

                transactions,

                rejectedRows,

                transactionCount:
                    transactions.length,

                rejectedRowCount:
                    rejectedRows.length,
            },
        });
    } catch (error) {
        console.error(
            "Get case dataset error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to retrieve case dataset",
        });
    }
};
