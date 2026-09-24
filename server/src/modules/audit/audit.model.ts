import mongoose, {
    Schema,
} from "mongoose";

export const AUDIT_EVENT_TYPES = [
    "HTTP_REQUEST",
    "BUSINESS_EVENT",
] as const;

const auditLogSchema = new Schema(
    {
        /*
         * ----------------------------------------
         * WHO PERFORMED THE ACTION
         * ----------------------------------------
         */

        actorId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        actorRole: {
            type: String,
            default: null,
        },

        /*
         * ----------------------------------------
         * AUDIT EVENT TYPE
         * ----------------------------------------
         *
         * HTTP_REQUEST:
         * Automatically created by audit middleware.
         *
         * BUSINESS_EVENT:
         * Meaningful workflow event such as:
         * CASE_ASSIGNED
         * CASE_SUBMITTED
         * CASE_RETURNED
         * CASE_APPROVED
         */

        eventType: {
            type: String,
            enum: AUDIT_EVENT_TYPES,
            default: "HTTP_REQUEST",
        },

        /*
         * ----------------------------------------
         * BUSINESS ENTITY
         * ----------------------------------------
         *
         * Example:
         *
         * entityType = "CASE"
         * entityId   = MongoDB case ID
         */

        entityType: {
            type: String,
            default: null,
        },

        entityId: {
            type: Schema.Types.ObjectId,
            default: null,
        },

        /*
         * ----------------------------------------
         * BUSINESS ACTION
         * ----------------------------------------
         *
         * Examples:
         *
         * CASE_ASSIGNED
         * INVESTIGATION_STARTED
         * INVESTIGATION_UPDATED
         * CASE_SUBMITTED
         * CASE_RETURNED
         * CASE_APPROVED
         */

        action: {
            type: String,
            default: null,
        },

        description: {
            type: String,
            trim: true,
            default: "",
        },

        /*
         * Safe structured information about
         * the business event.
         *
         * We will store things such as:
         * previousStatus
         * newStatus
         * assignedMakerId
         * returnReason
         *
         * We will NOT blindly store complete
         * request bodies or sensitive data.
         */

        metadata: {
            type: Schema.Types.Mixed,
            default: null,
        },

        /*
         * ----------------------------------------
         * HTTP REQUEST INFORMATION
         * ----------------------------------------
         */

        method: {
            type: String,
            default: null,
        },

        path: {
            type: String,
            default: null,
        },

        statusCode: {
            type: Number,
            default: null,
        },

        success: {
            type: Boolean,
            default: null,
        },

        ip: {
            type: String,
            default: "",
        },

        userAgent: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

/*
 * General newest-first audit view
 */
auditLogSchema.index({
    createdAt: -1,
});

/*
 * Activity performed by a particular user
 */
auditLogSchema.index({
    actorId: 1,
    createdAt: -1,
});

/*
 * Case / entity history timeline
 */
auditLogSchema.index({
    entityType: 1,
    entityId: 1,
    createdAt: 1,
});

/*
 * Search workflow actions
 */
auditLogSchema.index({
    action: 1,
    createdAt: -1,
});

export const AuditLog =
    mongoose.model(
        "AuditLog",
        auditLogSchema
    );