import mongoose, { Schema } from "mongoose";

const authSessionSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        tokenHash: {
            type: String,
            required: true,
        },

        expiresAt: {
            type: Date,
            required: true,
        },

        revokedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

authSessionSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
);

export const AuthSession = mongoose.model(
    "AuthSession",
    authSessionSchema
);