import type {
    Request,
    Response,
} from "express";

import mongoose from "mongoose";

import { AuditLog } from "./audit.model.js";
import { Case } from "../cases/case.model.js";

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

export const getAuditLogs = async (
    req: Request,
    res: Response
) => {
    try {
        const page = Math.max(
            Number(req.query.page) || 1,
            1
        );

        const limit = Math.min(
            Math.max(
                Number(req.query.limit) || 50,
                1
            ),
            100
        );

        const filter: Record<
            string,
            unknown
        > = {};

        if (req.query.method) {
            filter.method = String(
                req.query.method
            ).toUpperCase();
        }

        if (
            req.query.success === "true"
        ) {
            filter.success = true;
        }

        if (
            req.query.success === "false"
        ) {
            filter.success = false;
        }

        if (req.query.eventType) {
            filter.eventType =
                String(
                    req.query.eventType
                );
        }

        if (req.query.action) {
            filter.action =
                String(
                    req.query.action
                );
        }

        const [logs, total] =
            await Promise.all([
                AuditLog.find(filter)
                    .populate(
                        "actorId",
                        "name email role"
                    )
                    .sort({
                        createdAt: -1,
                    })
                    .skip(
                        (page - 1) * limit
                    )
                    .limit(limit)
                    .lean(),

                AuditLog.countDocuments(
                    filter
                ),
            ]);

        return res.status(200).json({
            success: true,
            data: logs,

            pagination: {
                page,
                limit,
                total,

                pages: Math.ceil(
                    total / limit
                ),
            },
        });
    } catch (error) {
        console.error(
            "Get audit logs error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to retrieve audit logs",
        });
    }
};

export const getCaseAuditHistory =
    async (
        req: Request,
        res: Response
    ) => {
        try {
            const caseId =
                getSingleParam(
                    req.params.caseId
                );

            const currentUser =
                res.locals.user;

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
             * Confirm the case exists first.
             */
            const caseRecord =
                await Case.findById(
                    caseId
                )
                    .select(
                        "assignedTo status"
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

            /*
             * Makers may only view the
             * history of cases assigned to them.
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
                            "You are not authorized to view this case history",
                    });
            }

            /*
             * Only meaningful business events
             * are shown in the case timeline.
             *
             * Raw HTTP request logs remain
             * available on the global Audit Logs page.
             */
            const history =
                await AuditLog.find({
                    eventType:
                        "BUSINESS_EVENT",

                    entityType:
                        "CASE",

                    entityId:
                        new mongoose.Types.ObjectId(
                            caseId
                        ),
                })
                    .populate(
                        "actorId",
                        "name email role"
                    )
                    .sort({
                        createdAt: 1,
                    })
                    .lean();

            return res
                .status(200)
                .json({
                    success: true,
                    data: history,
                });
        } catch (error) {
            console.error(
                "Get case audit history error:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,
                    message:
                        "Unable to retrieve case history",
                });
        }
    };