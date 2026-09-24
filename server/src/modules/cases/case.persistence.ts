import {
    Case,
} from "./case.model.js";

import {
    Exception,
} from "../exceptions/exception.model.js";

import {
    DataQualityIssue,
} from "../data-quality/data-quality.model.js";

type CaseDocument =
    InstanceType<typeof Case>;

/*
 * ----------------------------------------
 * SAVE CASE + LINKED ORIGIN
 * ----------------------------------------
 *
 * A Case can originate from:
 *
 * 1. RECONCILIATION_EXCEPTION
 * 2. DATA_QUALITY_ISSUE
 *
 * This function keeps the Case and its
 * originating business record consistent
 * inside the same MongoDB transaction.
 */
export const saveCaseAndOrigin =
    async (
        caseRecord: CaseDocument
    ) => {
        /*
         * Older Case records may not
         * physically contain originType.
         *
         * Treat them as existing
         * reconciliation cases.
         */
        const originType =
            caseRecord.originType ||
            "RECONCILIATION_EXCEPTION";

        /*
         * ========================================
         * RECONCILIATION EXCEPTION CASE
         * ========================================
         */
        if (
            originType ===
            "RECONCILIATION_EXCEPTION"
        ) {
            let exceptionStatus:
                | "ASSIGNED"
                | "RESOLVED";

            switch (
                caseRecord.status
            ) {
                /*
                 * Exception remains
                 * operationally active.
                 */
                case "ASSIGNED":
                case "RETURNED_TO_MAKER":
                case "APPROVED":
                    exceptionStatus =
                        "ASSIGNED";

                    break;

                /*
                 * Corrective action has
                 * actually been completed.
                 */
                case "RESOLVED":
                case "CLOSED":
                    exceptionStatus =
                        "RESOLVED";

                    break;

                default:
                    throw new Error(
                        "This case status does not support a linked exception update"
                    );
            }

            if (
                !caseRecord.exceptionId
            ) {
                throw new Error(
                    "Reconciliation case does not have a linked exception"
                );
            }

            await Case.db.transaction(
                async (session) => {
                    await caseRecord.save({
                        session,
                    });

                    const result =
                        await Exception.updateOne(
                            {
                                _id:
                                    caseRecord.exceptionId,
                            },
                            {
                                $set: {
                                    status:
                                        exceptionStatus,
                                },
                            },
                            {
                                session,

                                runValidators:
                                    true,
                            }
                        );

                    if (
                        result.matchedCount !==
                        1
                    ) {
                        throw new Error(
                            "The exception linked to this case is unavailable"
                        );
                    }
                },
                {
                    readPreference:
                        "primary",

                    readConcern: {
                        level:
                            "snapshot",
                    },

                    writeConcern: {
                        w: "majority",
                    },
                }
            );

            return caseRecord;
        }

        /*
         * ========================================
         * DATA QUALITY CASE
         * ========================================
         */
        if (
            originType ===
            "DATA_QUALITY_ISSUE"
        ) {
            if (
                !caseRecord.dataQualityIssueId
            ) {
                throw new Error(
                    "Data Quality case does not have a linked Data Quality issue"
                );
            }

            await Case.db.transaction(
                async (session) => {
                    /*
                     * Load the linked issue in the
                     * same transaction.
                     */
                    const issue =
                        await DataQualityIssue.findById(
                            caseRecord.dataQualityIssueId
                        ).session(
                            session
                        );

                    if (!issue) {
                        throw new Error(
                            "The Data Quality issue linked to this case is unavailable"
                        );
                    }

                    /*
                     * --------------------------------
                     * CASE CREATED / ASSIGNED
                     * --------------------------------
                     *
                     * This is the first operational
                     * handoff:
                     *
                     * Data Quality
                     *     ↓
                     * Operations/Admin
                     *     ↓
                     * Maker
                     */
                    if (
                        caseRecord.status ===
                        "ASSIGNED"
                    ) {
                        /*
                         * Never reopen something that
                         * BankSync already objectively
                         * verified as resolved.
                         */
                        if (
                            issue.status ===
                            "VERIFIED_RESOLVED"
                        ) {
                            throw new Error(
                                "A verified resolved Data Quality issue cannot be assigned for investigation"
                            );
                        }

                        /*
                         * Link both records.
                         */
                        issue.caseId =
                            caseRecord._id;

                        /*
                         * Only the original OPEN state
                         * becomes UNDER_REVIEW.
                         *
                         * Reassigning the Maker must
                         * not destroy a later workflow
                         * state such as:
                         *
                         * CORRECTION_REQUIRED
                         * PENDING_VERIFICATION
                         * VERIFICATION_FAILED
                         */
                        if (
                            issue.status ===
                            "OPEN"
                        ) {
                            issue.status =
                                "UNDER_REVIEW";

                            issue.reviewStartedAt =
                                issue.reviewStartedAt ||
                                new Date();

                            if (
                                !issue.reviewStartedBy &&
                                caseRecord.assignedBy
                            ) {
                                issue.reviewStartedBy =
                                    caseRecord.assignedBy;
                            }
                        }
                    }

                    /*
                     * --------------------------------
                     * MAKER / CHECKER WORKFLOW
                     * --------------------------------
                     *
                     * Returning a Case to Maker or
                     * approving the investigation
                     * does NOT mean the source data
                     * has been corrected.
                     *
                     * Therefore we do not mark the
                     * Data Quality Issue resolved.
                     */
                    if (
                        caseRecord.status ===
                            "RETURNED_TO_MAKER" ||
                        caseRecord.status ===
                            "APPROVED"
                    ) {
                        issue.caseId =
                            caseRecord._id;

                        /*
                         * Protect later workflow
                         * states from being reset.
                         */
                        if (
                            issue.status ===
                            "OPEN"
                        ) {
                            issue.status =
                                "UNDER_REVIEW";
                        }
                    }

                    /*
                     * --------------------------------
                     * FINAL RESOLUTION SAFETY GATE
                     * --------------------------------
                     *
                     * A human cannot close a Data
                     * Quality case unless BankSync
                     * has already verified that the
                     * actual data defect disappeared
                     * from a corrected upload.
                     */
                    if (
                        caseRecord.status ===
                            "RESOLVED" ||
                        caseRecord.status ===
                            "CLOSED"
                    ) {
                        if (
                            issue.status !==
                            "VERIFIED_RESOLVED"
                        ) {
                            throw new Error(
                                "Data Quality case cannot be resolved or closed until BankSync verifies the correction"
                            );
                        }

                        issue.caseId =
                            caseRecord._id;
                    }

                    /*
                     * Save both sides together.
                     *
                     * If either save fails,
                     * MongoDB rolls back both.
                     */
                    await caseRecord.save({
                        session,
                    });

                    await issue.save({
                        session,
                    });
                },
                {
                    readPreference:
                        "primary",

                    readConcern: {
                        level:
                            "snapshot",
                    },

                    writeConcern: {
                        w: "majority",
                    },
                }
            );

            return caseRecord;
        }

        /*
         * Unknown origin should never silently
         * fall through.
         */
        throw new Error(
            "Unsupported case origin type"
        );
    };

/*
 * ----------------------------------------
 * TEMPORARY COMPATIBILITY EXPORT
 * ----------------------------------------
 *
 * Existing controllers currently import:
 *
 * saveCaseAndException
 *
 * Keeping this alias means we do not break
 * the working reconciliation workflow while
 * we migrate the controllers one-by-one.
 *
 * Both names now execute the same
 * origin-aware logic.
 */
export const saveCaseAndException =
    saveCaseAndOrigin;