import mongoose from "mongoose";
import type {
    NextFunction,
    Request,
    Response,
} from "express";

import {
    Case,
} from "./case.model.js";

import {
    Exception,
} from "../exceptions/exception.model.js";

import {
    Reconciliation,
} from "../reconciliation/reconciliation.model.js";

import {
    DataQualityIssue,
} from "../data-quality/data-quality.model.js";

/*
 * ----------------------------------------
 * CASE READINESS CHECK
 * ----------------------------------------
 *
 * RECONCILIATION_EXCEPTION
 * ----------------------------------------
 * The linked reconciliation must exist
 * and must already be COMPLETED.
 *
 * DATA_QUALITY_ISSUE
 * ----------------------------------------
 * Reconciliation is not required.
 *
 * The linked Data Quality issue must
 * exist so the investigation always
 * has a valid source record.
 *
 * MAKER
 * ----------------------------------------
 * A Maker may only act on a Case that
 * is assigned specifically to them.
 */
export const requireCompletedCaseReconciliation =
    async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const idParam =
                req.params.id;

            const caseId =
                Array.isArray(
                    idParam
                )
                    ? idParam[0]
                    : idParam;

            /*
             * ----------------------------------------
             * VALIDATE CASE ID
             * ----------------------------------------
             */
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

            /*
             * ----------------------------------------
             * LOAD CASE ORIGIN
             * ----------------------------------------
             */
            const caseRecord =
                await Case.findById(
                    caseId
                )
                    .select(
                        [
                            "originType",
                            "exceptionId",
                            "dataQualityIssueId",
                            "originalUploadId",
                            "assignedTo",
                        ].join(" ")
                    )
                    .lean();

            if (!caseRecord) {
                return res
                    .status(404)
                    .json({
                        success: false,

                        message:
                            "Case not found",
                    });
            }

            const currentUser =
                res.locals.user;

            /*
             * ----------------------------------------
             * MAKER OWNERSHIP CHECK
             * ----------------------------------------
             *
             * This applies to BOTH:
             *
             * - Reconciliation cases
             * - Data Quality cases
             */
            if (
                currentUser.role ===
                    "MAKER" &&
                caseRecord.assignedTo?.toString() !==
                    currentUser.userId
            ) {
                return res
                    .status(403)
                    .json({
                        success: false,

                        message:
                            "This case is not assigned to you",
                    });
            }

            /*
             * ----------------------------------------
             * DETERMINE CASE ORIGIN
             * ----------------------------------------
             *
             * Older Case records created before
             * originType existed may not physically
             * contain the field in MongoDB.
             *
             * Treat those safely as existing
             * reconciliation cases.
             */
            const originType =
                caseRecord.originType ||
                "RECONCILIATION_EXCEPTION";

            /*
             * ========================================
             * DATA QUALITY CASE
             * ========================================
             */
            if (
                originType ===
                "DATA_QUALITY_ISSUE"
            ) {
                /*
                 * Data Quality investigations do
                 * NOT depend on a reconciliation.
                 */
                if (
                    !caseRecord.dataQualityIssueId
                ) {
                    return res
                        .status(409)
                        .json({
                            success:
                                false,

                            message:
                                "The Data Quality issue linked to this case is unavailable",
                        });
                }

                /*
                 * Confirm the original Data Quality
                 * issue still exists.
                 *
                 * We do not require any particular
                 * Data Quality status here because
                 * the Case may need to continue
                 * through investigation, correction,
                 * verification, and final closure.
                 */
                const dataQualityIssue =
                    await DataQualityIssue.findById(
                        caseRecord.dataQualityIssueId
                    )
                        .select(
                            "_id status uploadId"
                        )
                        .lean();

                if (
                    !dataQualityIssue
                ) {
                    return res
                        .status(409)
                        .json({
                            success:
                                false,

                            message:
                                "The Data Quality issue linked to this case is unavailable",
                        });
                }

                /*
                 * Data Quality Case is ready.
                 *
                 * No reconciliation check is needed.
                 */
                return next();
            }

            /*
             * ========================================
             * RECONCILIATION EXCEPTION CASE
             * ========================================
             */

            if (
                !caseRecord.exceptionId
            ) {
                return res
                    .status(409)
                    .json({
                        success: false,

                        message:
                            "The exception linked to this case is unavailable",
                    });
            }

            const exception =
                await Exception.findById(
                    caseRecord.exceptionId
                )
                    .select(
                        "reconciliationId"
                    )
                    .lean();

            if (!exception) {
                return res
                    .status(409)
                    .json({
                        success: false,

                        message:
                            "The exception linked to this case is unavailable",
                    });
            }

            if (
                !exception.reconciliationId
            ) {
                return res
                    .status(409)
                    .json({
                        success: false,

                        message:
                            "The reconciliation linked to this case is unavailable",
                    });
            }

            const reconciliation =
                await Reconciliation.findById(
                    exception.reconciliationId
                )
                    .select(
                        "status"
                    )
                    .lean();

            if (
                !reconciliation
            ) {
                return res
                    .status(409)
                    .json({
                        success: false,

                        message:
                            "The reconciliation linked to this case is unavailable",
                    });
            }

            /*
             * Reconciliation cases remain protected
             * exactly as before.
             */
            if (
                reconciliation.status !==
                "COMPLETED"
            ) {
                return res
                    .status(409)
                    .json({
                        success: false,

                        message:
                            "Case actions are available only after reconciliation completes successfully",
                    });
            }

            return next();
        } catch (error) {
            console.error(
                "Check case readiness error:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,

                    message:
                        "Unable to verify case readiness",
                });
        }
    };