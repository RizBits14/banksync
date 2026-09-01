import mongoose from "mongoose";

import type {
    Request,
    Response,
} from "express";

import { Reconciliation } from "../reconciliation/reconciliation.model.js";
import { ReconciliationResult } from "../reconciliation/reconciliation-result.model.js";

import { Exception } from "../exceptions/exception.model.js";
import { Case } from "../cases/case.model.js";

import {
    sendCsv,
    sendXlsx,
    type ReportRow,
} from "./report.helper.js";

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

export const exportReconciliationReport =
    async (
        req: Request,
        res: Response
    ) => {
        try {
            const { id } = req.params;

            const format =
                getFormat(req);

            if (!format) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Format must be csv or xlsx",
                });
            }

            if (
                !mongoose.isValidObjectId(id)
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

            const results =
                (await ReconciliationResult.find({
                    reconciliationId: id,
                })
                    .populate(
                        "sourceTransactionId"
                    )
                    .populate(
                        "targetTransactionId"
                    )
                    .lean()) as any[];

            const rows: ReportRow[] =
                results.map((result) => {
                    const source =
                        result.sourceTransactionId;

                    const target =
                        result.targetTransactionId;

                    return {
                        resultId:
                            String(result._id),

                        result:
                            result.result,

                        matchScore:
                            result.matchScore ??
                            "",

                        sourceTransactionId:
                            source?.transactionId ||
                            "",

                        sourceSystem:
                            source?.sourceSystem ||
                            "",

                        sourceReference:
                            source?.referenceNumber ||
                            "",

                        sourceAmount:
                            source?.amount?.toString?.() ||
                            "",

                        sourceStatus:
                            source?.status || "",

                        targetTransactionId:
                            target?.transactionId ||
                            "",

                        targetSystem:
                            target?.sourceSystem ||
                            "",

                        targetReference:
                            target?.referenceNumber ||
                            "",

                        targetAmount:
                            target?.amount?.toString?.() ||
                            "",

                        targetStatus:
                            target?.status || "",
                    };
                });

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

            return res.status(500).json({
                success: false,
                message:
                    "Unable to export reconciliation report",
            });
        }
    };

export const exportExceptionsReport =
    async (
        req: Request,
        res: Response
    ) => {
        try {
            const format =
                getFormat(req);

            if (!format) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Format must be csv or xlsx",
                });
            }

            const exceptions =
                (await Exception.find()
                    .populate("transactionId")
                    .sort({
                        createdAt: -1,
                    })
                    .lean()) as any[];

            const rows: ReportRow[] =
                exceptions.map(
                    (exception) => ({
                        exceptionId:
                            String(exception._id),

                        reconciliationId:
                            String(
                                exception.reconciliationId
                            ),

                        transactionId:
                            exception.transactionId
                                ?.transactionId || "",

                        sourceSystem:
                            exception.transactionId
                                ?.sourceSystem || "",

                        exceptionType:
                            exception.exceptionType,

                        score:
                            exception.score,

                        reasons:
                            Array.isArray(
                                exception.reasons
                            )
                                ? exception.reasons.join(
                                    "; "
                                )
                                : "",

                        status:
                            exception.status,

                        createdAt:
                            exception.createdAt
                                ? new Date(
                                    exception.createdAt
                                ).toISOString()
                                : "",
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

            return res.status(500).json({
                success: false,
                message:
                    "Unable to export exceptions report",
            });
        }
    };

export const exportCasesReport =
    async (
        req: Request,
        res: Response
    ) => {
        try {
            const format =
                getFormat(req);

            if (!format) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Format must be csv or xlsx",
                });
            }

            const cases =
                (await Case.find()
                    .populate("exceptionId")
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
                        createdAt: -1,
                    })
                    .lean()) as any[];

            const rows: ReportRow[] =
                cases.map((caseRecord) => ({
                    caseId:
                        String(caseRecord._id),

                    exceptionId:
                        String(
                            caseRecord.exceptionId
                                ?._id || ""
                        ),

                    exceptionType:
                        caseRecord.exceptionId
                            ?.exceptionType || "",

                    exceptionScore:
                        caseRecord.exceptionId
                            ?.score ?? "",

                    priority:
                        caseRecord.priority,

                    status:
                        caseRecord.status,

                    assignedTo:
                        caseRecord.assignedTo
                            ?.name || "",

                    investigationNotes:
                        caseRecord.investigationNotes ||
                        "",

                    proposedResolution:
                        caseRecord.proposedResolution ||
                        "",

                    submittedBy:
                        caseRecord.submittedBy
                            ?.name || "",

                    checkedBy:
                        caseRecord.checkedBy
                            ?.name || "",

                    checkerComment:
                        caseRecord.checkerComment ||
                        "",

                    createdAt:
                        caseRecord.createdAt
                            ? new Date(
                                caseRecord.createdAt
                            ).toISOString()
                            : "",
                }));

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

            return res.status(500).json({
                success: false,
                message:
                    "Unable to export cases report",
            });
        }
    };