import mongoose, { Schema } from "mongoose";

interface IValidationIssue {
    field: string;
    message: string;
}

interface IUploadRejectedRow {
    uploadId: mongoose.Types.ObjectId;

    recordNumber: number;

    rawRecord: Record<string, unknown>;

    validationIssues: IValidationIssue[];

    createdAt: Date;
    updatedAt: Date;
}

const validationIssueSchema =
    new Schema<IValidationIssue>(
        {
            field: {
                type: String,
                required: true,
            },

            message: {
                type: String,
                required: true,
            },
        },
        {
            _id: false,
        }
    );

const uploadRejectedRowSchema =
    new Schema<IUploadRejectedRow>(
        {
            uploadId: {
                type: Schema.Types.ObjectId,
                ref: "Upload",
                required: true,
                index: true,
            },

            recordNumber: {
                type: Number,
                required: true,
            },

            rawRecord: {
                type: Schema.Types.Mixed,
                required: true,
            },

            validationIssues: {
                type: [validationIssueSchema],
                default: [],
            },
        },
        {
            timestamps: true,
        }
    );

uploadRejectedRowSchema.index({
    uploadId: 1,
    recordNumber: 1,
});

export const UploadRejectedRow =
    mongoose.model<IUploadRejectedRow>(
        "UploadRejectedRow",
        uploadRejectedRowSchema
    );