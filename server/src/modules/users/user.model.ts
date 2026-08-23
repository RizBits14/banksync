import mongoose, { Schema } from "mongoose";

export type UserRole =
    | "ADMIN"
    | "IMPORT_OFFICER"
    | "MAKER"
    | "CHECKER"
    | "AUDITOR"
    | "OPERATIONS_MANAGER";

const userSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        password: {
            type: String,
            required: true,
        },

        role: {
            type: String,
            enum: [
                "ADMIN",
                "IMPORT_OFFICER",
                "MAKER",
                "CHECKER",
                "AUDITOR",
                "OPERATIONS_MANAGER",
            ],
            required: true,
        },

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

export const User = mongoose.model("User", userSchema);