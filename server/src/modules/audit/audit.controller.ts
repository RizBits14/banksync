import type {
    Request,
    Response,
} from "express";

import { AuditLog } from "./audit.model.js";

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