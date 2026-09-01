import mongoose, {
    Schema,
} from "mongoose";

const auditLogSchema = new Schema(
    {
        actorId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        actorRole: {
            type: String,
            default: null,
        },

        method: {
            type: String,
            required: true,
        },

        path: {
            type: String,
            required: true,
        },

        statusCode: {
            type: Number,
            required: true,
        },

        success: {
            type: Boolean,
            required: true,
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

auditLogSchema.index({
    createdAt: -1,
});

auditLogSchema.index({
    actorId: 1,
    createdAt: -1,
});

export const AuditLog =
    mongoose.model(
        "AuditLog",
        auditLogSchema
    );