import mongoose, {
    Schema,
} from "mongoose";

export const ACCOUNT_REQUEST_STATUSES = [
    "PENDING",
    "APPROVED",
    "REJECTED",
] as const;

export type AccountRequestStatus =
    (typeof ACCOUNT_REQUEST_STATUSES)[number];

const accountRequestSchema =
    new Schema(
        {
            name: {
                type: String,
                required: true,
                trim: true,
            },

            email: {
                type: String,
                required: true,
                trim: true,
                lowercase: true,
            },

            status: {
                type: String,
                enum: ACCOUNT_REQUEST_STATUSES,
                default: "PENDING",
                required: true,
            },

            reviewedBy: {
                type: Schema.Types.ObjectId,
                ref: "User",
                default: null,
            },

            reviewedAt: {
                type: Date,
                default: null,
            },

            createdUserId: {
                type: Schema.Types.ObjectId,
                ref: "User",
                default: null,
            },

            rejectionReason: {
                type: String,
                default: "",
                trim: true,
            },
        },
        {
            timestamps: true,
        }
    );

accountRequestSchema.index({
    status: 1,
    createdAt: -1,
});

accountRequestSchema.index({
    email: 1,
    createdAt: -1,
});

export const AccountRequest =
    mongoose.model(
        "AccountRequest",
        accountRequestSchema
    );