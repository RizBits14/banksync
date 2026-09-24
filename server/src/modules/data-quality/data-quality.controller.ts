import mongoose from "mongoose";

import type {
    Request,
    Response,
} from "express";

import {
    DataQualityIssue,
} from "./data-quality.model.js";

import {
    scanUploadDataQuality,
    UploadNotReadyError,
} from "./data-quality.service.js";

import {
    Case,
} from "../cases/case.model.js";

import {
    User,
} from "../users/user.model.js";

import {
    createBusinessAudit,
} from "../audit/audit.service.js";

/*
 * ----------------------------------------
 * HELPER
 * ----------------------------------------
 */
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

/*
 * ----------------------------------------
 * SCAN UPLOAD
 * ----------------------------------------
 */
export const scanUpload = async (
    req: Request,
    res: Response
) => {
    try {
        const uploadId =
            getSingleParam(
                req.params.uploadId
            );

        if (!uploadId) {
            return res
                .status(400)
                .json({
                    success: false,

                    message:
                        "Upload ID is required",
                });
        }

        if (
            !mongoose.isValidObjectId(
                uploadId
            )
        ) {
            return res
                .status(400)
                .json({
                    success: false,

                    message:
                        "Invalid upload ID",
                });
        }

        const result =
            await scanUploadDataQuality(
                uploadId
            );

        return res
            .status(200)
            .json({
                success: true,

                message:
                    "Data quality scan completed",

                data: result,
            });
    } catch (error) {
        if (
            error instanceof
            UploadNotReadyError
        ) {
            return res
                .status(409)
                .json({
                    success: false,

                    message:
                        error.message,
                });
        }

        console.error(
            "Data quality scan error:",
            error
        );

        const message =
            error instanceof Error
                ? error.message
                : "Unable to scan upload";

        if (
            message ===
            "Upload not found"
        ) {
            return res
                .status(404)
                .json({
                    success: false,
                    message,
                });
        }

        return res
            .status(500)
            .json({
                success: false,

                message:
                    "Unable to scan upload",
            });
    }
};

/*
 * ----------------------------------------
 * GET DATA QUALITY ISSUES
 * ----------------------------------------
 */
export const getDataQualityIssues =
    async (
        req: Request,
        res: Response
    ) => {
        try {
            const filter: Record<
                string,
                unknown
            > = {};

            if (
                req.query.uploadId
            ) {
                const uploadId =
                    String(
                        req.query
                            .uploadId
                    );

                if (
                    !mongoose.isValidObjectId(
                        uploadId
                    )
                ) {
                    return res
                        .status(400)
                        .json({
                            success:
                                false,

                            message:
                                "Invalid upload ID",
                        });
                }

                filter.uploadId =
                    uploadId;
            }

            if (
                req.query.issueType
            ) {
                filter.issueType =
                    String(
                        req.query
                            .issueType
                    );
            }

            if (
                req.query.status
            ) {
                filter.status =
                    String(
                        req.query
                            .status
                    );
            }

            if (
                req.query.severity
            ) {
                filter.severity =
                    String(
                        req.query
                            .severity
                    );
            }

            /*
             * Load issues first.
             *
             * IMPORTANT:
             * We do not rely only on DataQualityIssue.caseId
             * when deciding whether a Case exists.
             *
             * Historical/dev data can contain either:
             *
             * 1. issue.caseId -> missing/deleted Case
             * 2. Case.dataQualityIssueId -> issue, while
             *    issue.caseId is missing/out of sync
             *
             * The Case record is the authoritative
             * investigation record, so we cross-check
             * from the Case side as well.
             */
            const issues =
                await DataQualityIssue.find(
                    filter
                )
                    .populate(
                        "uploadId",
                        "originalName fileName sourceSystem status totalRows validRows invalidRows"
                    )
                    .populate(
                        "primaryTransactionId"
                    )
                    .populate(
                        "relatedTransactionIds"
                    )
                    .populate(
                        "caseId",
                        "originType status priority assignedTo assignedAt"
                    )
                    .populate(
                        "reviewStartedBy",
                        "name email role"
                    )
                    .sort({
                        createdAt: -1,
                    })
                    .lean();

            const issueIds =
                issues.map(
                    (issue: any) =>
                        issue._id
                );

            const linkedCases =
                issueIds.length > 0
                    ? await Case.find({
                          dataQualityIssueId: {
                              $in: issueIds,
                          },
                      })
                          .select(
                              "_id originType status priority assignedTo assignedAt dataQualityIssueId"
                          )
                          .populate(
                              "assignedTo",
                              "name email role"
                          )
                          .lean()
                    : [];

            const caseByIssueId =
                new Map(
                    linkedCases.map(
                        (caseRecord: any) => [
                            caseRecord
                                .dataQualityIssueId
                                .toString(),

                            caseRecord,
                        ]
                    )
                );

            const connectedIssues =
                issues.map(
                    (issue: any) => {
                        const authoritativeCase =
                            caseByIssueId.get(
                                issue._id.toString()
                            );

                        return {
                            ...issue,

                            /*
                             * Prefer the Case located through
                             * Case.dataQualityIssueId.
                             *
                             * If there is no such Case, keep a
                             * successfully populated issue.caseId.
                             *
                             * A dangling ObjectId becomes null
                             * after populate and is therefore not
                             * presented to the UI as a real Case.
                             */
                            caseId:
                                authoritativeCase ||
                                issue.caseId ||
                                null,
                        };
                    }
                );

            return res
                .status(200)
                .json({
                    success: true,
                    data: connectedIssues,
                });
        } catch (error) {
            console.error(
                "Get data quality issues error:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,

                    message:
                        "Unable to retrieve data quality issues",
                });
        }
    };

/*
 * ----------------------------------------
 * GET DATA QUALITY SUMMARY
 * ----------------------------------------
 */
export const getDataQualitySummary =
    async (
        _req: Request,
        res: Response
    ) => {
        try {
            const [
                totalIssues,
                openIssues,
                byType,
                bySeverity,
            ] = await Promise.all([
                DataQualityIssue.countDocuments(),

                /*
                 * Anything that has not been
                 * objectively verified is still
                 * operationally unresolved.
                 */
                DataQualityIssue.countDocuments(
                    {
                        status: {
                            $nin: [
                                "VERIFIED_RESOLVED",
                                "RESOLVED",
                            ],
                        },
                    }
                ),

                DataQualityIssue.aggregate(
                    [
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
                    ]
                ),

                DataQualityIssue.aggregate(
                    [
                        {
                            $group: {
                                _id:
                                    "$severity",

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
                    ]
                ),
            ]);

            return res
                .status(200)
                .json({
                    success: true,

                    data: {
                        totalIssues,
                        openIssues,
                        byType,
                        bySeverity,
                    },
                });
        } catch (error) {
            console.error(
                "Data quality summary error:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,

                    message:
                        "Unable to retrieve data quality summary",
                });
        }
    };

/*
 * ----------------------------------------
 * CREATE DATA QUALITY INVESTIGATION
 * ----------------------------------------
 *
 * Admin / Operations Manager:
 *
 * 1. Selects an active Maker.
 * 2. Selects Case priority.
 *
 * BankSync then:
 *
 * 1. Creates the Case.
 * 2. Assigns it to the Maker.
 * 3. Links the Case to the Data Quality issue.
 * 4. Moves the issue OPEN -> UNDER_REVIEW.
 *
 * All core database changes happen inside
 * one MongoDB transaction.
 */
export const createDataQualityInvestigation =
    async (
        req: Request,
        res: Response
    ) => {
        const session =
            await mongoose.startSession();

        let createdCaseId:
            string | null = null;

        let issueIdForAudit:
            string | null = null;

        let makerIdForAudit:
            string | null = null;

        let priorityForAudit:
            string | null = null;

        try {
            const issueId =
                getSingleParam(
                    req.params.id
                );

            const makerId =
                getSingleParam(
                    req.body?.makerId
                );

            const priority =
                req.body?.priority;

            /*
             * ----------------------------------------
             * BASIC VALIDATION
             * ----------------------------------------
             */
            if (
                !issueId ||
                !mongoose.isValidObjectId(
                    issueId
                )
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,

                        message:
                            "Invalid Data Quality issue ID",
                    });
            }

            if (
                !makerId ||
                !mongoose.isValidObjectId(
                    makerId
                )
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,

                        message:
                            "Invalid Maker ID",
                    });
            }

            /*
             * ----------------------------------------
             * VALIDATE MAKER
             * ----------------------------------------
             */
            const maker =
                await User.findById(
                    makerId
                )
                    .select(
                        "name email role isActive"
                    )
                    .lean();

            if (
                !maker ||
                !maker.isActive ||
                maker.role !==
                    "MAKER"
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,

                        message:
                            "Selected user must be an active Maker",
                    });
            }

            /*
             * ----------------------------------------
             * TRANSACTION
             * ----------------------------------------
             */
            await session.withTransaction(
                async () => {
                    /*
                     * Load the issue inside
                     * the transaction.
                     */
                    const issue =
                        await DataQualityIssue.findById(
                            issueId
                        ).session(
                            session
                        );

                    if (!issue) {
                        throw new Error(
                            "DATA_QUALITY_ISSUE_NOT_FOUND"
                        );
                    }

                    /*
                     * --------------------------------
                     * CASE LINK INTEGRITY CHECK
                     * --------------------------------
                     *
                     * We must protect against duplicate
                     * Cases, but we must also distinguish
                     * a REAL Case from a stale ObjectId.
                     *
                     * First check the authoritative Case
                     * side using dataQualityIssueId.
                     */
                    const existingCaseForIssue =
                        await Case.findOne({
                            dataQualityIssueId:
                                issue._id,
                        })
                            .select(
                                "_id status"
                            )
                            .session(
                                session
                            );

                    if (
                        existingCaseForIssue
                    ) {
                        /*
                         * Repair the forward pointer if
                         * the Case exists but issue.caseId
                         * is missing or points elsewhere.
                         */
                        if (
                            !issue.caseId ||
                            issue.caseId.toString() !==
                                existingCaseForIssue
                                    ._id
                                    .toString()
                        ) {
                            issue.caseId =
                                existingCaseForIssue
                                    ._id;

                            await issue.save({
                                session,
                            });
                        }

                        throw new Error(
                            "DATA_QUALITY_CASE_ALREADY_EXISTS"
                        );
                    }

                    /*
                     * No Case exists for this issue.
                     *
                     * If issue.caseId still contains an
                     * ObjectId, verify that it points to a
                     * real Case. If it does not, it is a
                     * stale/dangling link and must not
                     * permanently block a new investigation.
                     */
                    if (
                        issue.caseId
                    ) {
                        const pointedCase =
                            await Case.findById(
                                issue.caseId
                            )
                                .select(
                                    "_id dataQualityIssueId"
                                )
                                .session(
                                    session
                                );

                        if (
                            pointedCase
                        ) {
                            throw new Error(
                                "DATA_QUALITY_CASE_ALREADY_EXISTS"
                            );
                        }

                        /*
                         * Stale pointer repair.
                         *
                         * We only clear the broken Case
                         * reference. The issue must still pass
                         * the normal OPEN-status check below
                         * before a new Case can be created.
                         */
                        issue.caseId =
                            null;

                        await issue.save({
                            session,
                        });
                    }

                    /*
                     * A new investigation starts
                     * only from OPEN.
                     *
                     * Later states already belong
                     * to an active remediation or
                     * verification workflow.
                     */
                    if (
                        issue.status !==
                        "OPEN"
                    ) {
                        throw new Error(
                            "DATA_QUALITY_ISSUE_NOT_OPEN"
                        );
                    }

                    /*
                     * Original upload is mandatory
                     * evidence for this Case.
                     */
                    if (
                        !issue.uploadId
                    ) {
                        throw new Error(
                            "DATA_QUALITY_UPLOAD_MISSING"
                        );
                    }

                    const now =
                        new Date();

                    /*
                     * --------------------------------
                     * CREATE CASE
                     * --------------------------------
                     */
                    const caseRecord =
                        new Case({
                            originType:
                                "DATA_QUALITY_ISSUE",

                            exceptionId:
                                null,

                            dataQualityIssueId:
                                issue._id,

                            originalUploadId:
                                issue.uploadId,

                            assignedTo:
                                maker._id,

                            assignedBy:
                                new mongoose.Types.ObjectId(
                                    res.locals.user
                                        .userId
                                ),

                            assignedAt:
                                now,

                            status:
                                "ASSIGNED",

                            priority,
                        });

                    await caseRecord.save({
                        session,
                    });

                    /*
                     * --------------------------------
                     * UPDATE DATA QUALITY ISSUE
                     * --------------------------------
                     */
                    issue.caseId =
                        caseRecord._id;

                    issue.status =
                        "UNDER_REVIEW";

                    issue.reviewStartedBy =
                        new mongoose.Types.ObjectId(
                            res.locals.user
                                .userId
                        );

                    issue.reviewStartedAt =
                        now;

                    await issue.save({
                        session,
                    });

                    createdCaseId =
                        caseRecord._id.toString();

                    issueIdForAudit =
                        issue._id.toString();

                    makerIdForAudit =
                        maker._id.toString();

                    priorityForAudit =
                        priority;
                }
            );

            if (
                !createdCaseId
            ) {
                throw new Error(
                    "CASE_CREATION_FAILED"
                );
            }

            /*
             * ----------------------------------------
             * AUDIT EVENTS
             * ----------------------------------------
             *
             * Core business records have already
             * committed successfully.
             *
             * We now write chronological business
             * audit events.
             */
            await createBusinessAudit({
                actorId:
                    res.locals.user.userId,

                actorRole:
                    res.locals.user.role,

                entityType:
                    "DATA_QUALITY_ISSUE",

                entityId:
                    issueIdForAudit!,

                action:
                    "DATA_QUALITY_CASE_CREATED",

                description:
                    "Investigation Case created for Data Quality issue",

                metadata: {
                    caseId:
                        createdCaseId,

                    assignedMakerId:
                        makerIdForAudit,

                    priority:
                        priorityForAudit,

                    previousStatus:
                        "OPEN",

                    newStatus:
                        "UNDER_REVIEW",
                },
            });

            await createBusinessAudit({
                actorId:
                    res.locals.user.userId,

                actorRole:
                    res.locals.user.role,

                entityType:
                    "CASE",

                entityId:
                    createdCaseId,

                action:
                    "CASE_ASSIGNED",

                description:
                    "Data Quality investigation Case assigned to Maker",

                metadata: {
                    originType:
                        "DATA_QUALITY_ISSUE",

                    dataQualityIssueId:
                        issueIdForAudit,

                    assignedMakerId:
                        makerIdForAudit,

                    priority:
                        priorityForAudit,

                    newStatus:
                        "ASSIGNED",
                },
            });

            await createBusinessAudit({
                actorId:
                    res.locals.user.userId,

                actorRole:
                    res.locals.user.role,

                entityType:
                    "DATA_QUALITY_ISSUE",

                entityId:
                    issueIdForAudit!,

                action:
                    "DATA_QUALITY_REVIEW_STARTED",

                description:
                    "Data Quality issue entered investigation workflow",

                metadata: {
                    caseId:
                        createdCaseId,

                    assignedMakerId:
                        makerIdForAudit,

                    status:
                        "UNDER_REVIEW",
                },
            });

            /*
             * ----------------------------------------
             * RETURN CONNECTED RECORD
             * ----------------------------------------
             */
            const createdCase =
                await Case.findById(
                    createdCaseId
                )
                    .populate(
                        "assignedTo",
                        "name email role"
                    )
                    .populate(
                        "assignedBy",
                        "name email role"
                    )
                    .populate(
                        "dataQualityIssueId",
                        "issueType severity status keyValue description sourceSystem uploadId"
                    )
                    .populate(
                        "originalUploadId",
                        "originalName fileName sourceSystem status totalRows validRows invalidRows"
                    );

            return res
                .status(201)
                .json({
                    success: true,

                    message:
                        "Data Quality investigation created and assigned successfully",

                    data: createdCase,
                });
        } catch (error) {
            if (
                error instanceof Error
            ) {
                if (
                    error.message ===
                    "DATA_QUALITY_ISSUE_NOT_FOUND"
                ) {
                    return res
                        .status(404)
                        .json({
                            success:
                                false,

                            message:
                                "Data Quality issue not found",
                        });
                }

                if (
                    error.message ===
                    "DATA_QUALITY_CASE_ALREADY_EXISTS"
                ) {
                    return res
                        .status(409)
                        .json({
                            success:
                                false,

                            message:
                                "This Data Quality issue already has an investigation Case",
                        });
                }

                if (
                    error.message ===
                    "DATA_QUALITY_ISSUE_NOT_OPEN"
                ) {
                    return res
                        .status(409)
                        .json({
                            success:
                                false,

                            message:
                                "Only an OPEN Data Quality issue can start a new investigation",
                        });
                }

                if (
                    error.message ===
                    "DATA_QUALITY_UPLOAD_MISSING"
                ) {
                    return res
                        .status(409)
                        .json({
                            success:
                                false,

                            message:
                                "The original upload linked to this Data Quality issue is unavailable",
                        });
                }
            }

            /*
             * Unique Data Quality Case index
             * protects against two Admins creating
             * the same investigation simultaneously.
             */
            if (
                error instanceof
                    mongoose.mongo
                        .MongoServerError &&
                error.code === 11000
            ) {
                return res
                    .status(409)
                    .json({
                        success: false,

                        message:
                            "This Data Quality issue already has an investigation Case",
                    });
            }

            console.error(
                "Create Data Quality investigation error:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,

                    message:
                        "Unable to create Data Quality investigation",
                });
        } finally {
            await session.endSession();
        }
    };