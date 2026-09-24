import mongoose from "mongoose";

import { AuditLog } from "./audit.model.js";

type BusinessAuditInput = {
    actorId?: string | null;
    actorRole?: string | null;

    entityType: string;
    entityId: string;

    action: string;
    description?: string;

    metadata?: Record<string, unknown> | null;
};

export const createBusinessAudit = async (
    input: BusinessAuditInput
) => {
    try {
        const actorObjectId =
            input.actorId &&
            mongoose.isValidObjectId(
                input.actorId
            )
                ? new mongoose.Types.ObjectId(
                      input.actorId
                  )
                : null;

        const entityObjectId =
            mongoose.isValidObjectId(
                input.entityId
            )
                ? new mongoose.Types.ObjectId(
                      input.entityId
                  )
                : null;

        if (!entityObjectId) {
            console.error(
                "Business audit skipped: invalid entity ID",
                input.entityId
            );

            return null;
        }

        return await AuditLog.create({
            actorId: actorObjectId,

            actorRole:
                input.actorRole || null,

            eventType:
                "BUSINESS_EVENT",

            entityType:
                input.entityType,

            entityId:
                entityObjectId,

            action:
                input.action,

            description:
                input.description || "",

            metadata:
                input.metadata || null,

            success: true,
        });
    } catch (error) {
        /*
         * Audit logging must never break
         * the main business operation.
         */
        console.error(
            "Business audit log error:",
            error
        );

        return null;
    }
};