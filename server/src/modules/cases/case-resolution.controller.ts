import type {
    Request,
    Response,
} from "express";

import mongoose from "mongoose";

import { Case } from "./case.model.js";
import {
    saveCaseAndException,
} from "./case.persistence.js";

import {
    createBusinessAudit,
} from "../audit/audit.service.js";

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

const normalizeText = (
    value: unknown
): string => {
    if (typeof value !== "string") {
        return "";
    }

    return value.trim();
};

/*
 * ----------------------------------------
 * RESOLVE CASE
 * ----------------------------------------
 *
 * APPROVED -> RESOLVED
 *
 * Admin / Operations Manager confirms
 * that the corrective action approved by
 * the Checker was actually completed.
 */
export const resolveCase = async (
    req: Request,
    res: Response
) => {
    try {
        const id =
            getSingleParam(
                req.params.id
            );

        const currentUser =
            res.locals.user;

        const resolutionExecutionNote =
            normalizeText(
                req.body
                    ?.resolutionExecutionNote
            );

        if (
            !id ||
            !mongoose.isValidObjectId(
                id
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid case ID",
            });
        }

        if (
            !currentUser?.userId ||
            !mongoose.isValidObjectId(
                currentUser.userId
            )
        ) {
            return res.status(401).json({
                success: false,
                message:
                    "Authenticated user not found",
            });
        }

        const caseRecord =
            await Case.findById(id);

        if (!caseRecord) {
            return res.status(404).json({
                success: false,
                message:
                    "Case not found",
            });
        }

        if (
            caseRecord.status !==
            "APPROVED"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Only an approved case can be resolved",
            });
        }

        const previousStatus =
            caseRecord.status;

        const now =
            new Date();

        caseRecord.status =
            "RESOLVED";

        caseRecord.resolutionExecutionNote =
            resolutionExecutionNote;

        caseRecord.resolvedBy =
            new mongoose.Types.ObjectId(
                currentUser.userId
            );

        caseRecord.resolvedAt =
            now;

        /*
         * A resolved case is not yet closed.
         */
        caseRecord.closureNote =
            "";

        caseRecord.closedBy =
            null;

        caseRecord.closedAt =
            null;

        await saveCaseAndException(
            caseRecord
        );

        await createBusinessAudit({
            actorId:
                currentUser.userId,

            actorRole:
                currentUser.role,

            entityType:
                "CASE",

            entityId:
                caseRecord._id.toString(),

            action:
                "CASE_RESOLVED",

            description:
                "Approved corrective action was confirmed as completed",

            metadata: {
                previousStatus,

                newStatus:
                    "RESOLVED",

                resolutionExecutionNote,
            },
        });

        return res.status(200).json({
            success: true,

            message:
                "Case resolved successfully",

            data: caseRecord,
        });
    } catch (error) {
        if (
            error instanceof
            mongoose.Error.VersionError
        ) {
            return res.status(409).json({
                success: false,

                message:
                    "This case changed while your request was being processed. Reload it before trying again",
            });
        }

        console.error(
            "Resolve case error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to resolve case",
        });
    }
};

/*
 * ----------------------------------------
 * CLOSE CASE
 * ----------------------------------------
 *
 * RESOLVED -> CLOSED
 *
 * Admin / Operations Manager performs the
 * final administrative closure.
 */
export const closeCase = async (
    req: Request,
    res: Response
) => {
    try {
        const id =
            getSingleParam(
                req.params.id
            );

        const currentUser =
            res.locals.user;

        const closureNote =
            normalizeText(
                req.body?.closureNote
            );

        if (
            !id ||
            !mongoose.isValidObjectId(
                id
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid case ID",
            });
        }

        if (
            !currentUser?.userId ||
            !mongoose.isValidObjectId(
                currentUser.userId
            )
        ) {
            return res.status(401).json({
                success: false,
                message:
                    "Authenticated user not found",
            });
        }

        const caseRecord =
            await Case.findById(id);

        if (!caseRecord) {
            return res.status(404).json({
                success: false,
                message:
                    "Case not found",
            });
        }

        if (
            caseRecord.status !==
            "RESOLVED"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Only a resolved case can be closed",
            });
        }

        const previousStatus =
            caseRecord.status;

        const now =
            new Date();

        caseRecord.status =
            "CLOSED";

        caseRecord.closureNote =
            closureNote;

        caseRecord.closedBy =
            new mongoose.Types.ObjectId(
                currentUser.userId
            );

        caseRecord.closedAt =
            now;

        await saveCaseAndException(
            caseRecord
        );

        await createBusinessAudit({
            actorId:
                currentUser.userId,

            actorRole:
                currentUser.role,

            entityType:
                "CASE",

            entityId:
                caseRecord._id.toString(),

            action:
                "CASE_CLOSED",

            description:
                "Resolved case was formally closed",

            metadata: {
                previousStatus,

                newStatus:
                    "CLOSED",

                closureNote,
            },
        });

        return res.status(200).json({
            success: true,

            message:
                "Case closed successfully",

            data: caseRecord,
        });
    } catch (error) {
        if (
            error instanceof
            mongoose.Error.VersionError
        ) {
            return res.status(409).json({
                success: false,

                message:
                    "This case changed while your request was being processed. Reload it before trying again",
            });
        }

        console.error(
            "Close case error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to close case",
        });
    }
};