import mongoose, { Schema } from "mongoose";

export const CASE_STATUSES = [
    "OPEN",
    "ASSIGNED",
    "UNDER_INVESTIGATION",
    "PENDING_CHECKER_APPROVAL",
    "RETURNED_TO_MAKER",
    "APPROVED",
    "RESOLVED",
    "CLOSED",
] as const;

export const CASE_PRIORITIES = [
    "LOW",
    "MEDIUM",
    "HIGH",
    "CRITICAL",
] as const;

const caseSchema = new Schema(
    {
        exceptionId: {
            type: Schema.Types.ObjectId,
            ref: "Exception",
            required: true,
            unique: true,
        },

        assignedTo: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        assignedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        assignedAt: {
            type: Date,
            default: null,
        },

        status: {
            type: String,
            enum: CASE_STATUSES,
            default: "OPEN",
        },

        priority: {
            type: String,
            enum: CASE_PRIORITIES,
            required: true,
        },

        investigationNotes: {
            type: String,
            default: "",
            trim: true,
        },

        proposedResolution: {
            type: String,
            default: "",
            trim: true,
        },

        investigationStartedAt: {
            type: Date,
            default: null,
        },

        submittedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        submittedAt: {
            type: Date,
            default: null,
        },

        checkedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        checkerComment: {
            type: String,
            default: "",
            trim: true,
        },

        resolvedAt: {
            type: Date,
            default: null,
        },

        closedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

export const Case = mongoose.model(
    "Case",
    caseSchema
);