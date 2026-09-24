import crypto from "node:crypto";
import mongoose from "mongoose";
import type {
    Request,
    Response,
} from "express";

import {
    Upload,
} from "../uploads/upload.model.js";

import {
    UploadRejectedRow,
} from "../uploads/upload.rejection.model.js";

import {
    parseUploadedFile,
    UploadHeaderError,
    type ParsedRecord,
} from "../uploads/upload.parser.js";

import {
    processTransactionBatch,
} from "../transactions/transaction.batch.js";

import {
    Transaction,
} from "../transactions/transaction.model.js";

import {
    saveTransactions,
    TransactionCleanupError,
} from "../transactions/transaction.service.js";

import {
    validateColumnMapping,
    type ColumnMapping,
} from "../uploads/upload.mapper.js";

import {
    DataQualityIssue,
} from "../data-quality/data-quality.model.js";

import {
    scanUploadDataQuality,
} from "../data-quality/data-quality.service.js";

import {
    createBusinessAudit,
} from "../audit/audit.service.js";

import {
    DataCorrectionTask,
} from "./data-correction.model.js";

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

const parseMapping = (
    value: unknown
): ColumnMapping | null => {
    if (
        value &&
        typeof value === "object"
    ) {
        return value as ColumnMapping;
    }

    if (typeof value !== "string") {
        return null;
    }

    try {
        const parsed =
            JSON.parse(value);

        if (
            parsed &&
            typeof parsed === "object"
        ) {
            return parsed as ColumnMapping;
        }

        return null;
    } catch {
        return null;
    }
};

const normalizeNote = (
    value: unknown
): string => {
    if (typeof value !== "string") {
        return "";
    }

    return value.trim();
};

/*
 * ----------------------------------------
 * SUBMIT CORRECTED SOURCE UPLOAD
 * ----------------------------------------
 *
 * Import Officer workflow:
 *
 * IN_PROGRESS
 *      ↓
 * corrected upload created as NEW Upload
 *      ↓
 * validation + transaction import
 *      ↓
 * automatic Data Quality re-scan
 *      ↓
 * original defect still exists?
 *
 * YES
 * → VERIFICATION_FAILED
 *
 * NO
 * → VERIFIED_RESOLVED
 *
 * The original upload is never modified.
 */
export const submitCorrectedUpload =
    async (
        req: Request,
        res: Response
    ) => {
        let createdUploadId:
            mongoose.Types.ObjectId
            | null = null;

        try {
            const taskId =
                getSingleParam(
                    req.params.taskId
                );

            const importOfficerId =
                res.locals.user?.userId;

            const actorRole =
                res.locals.user?.role;

            const file =
                req.file;

            const importOfficerNote =
                normalizeNote(
                    req.body
                        ?.importOfficerNote
                );

            const mapping =
                parseMapping(
                    req.body
                        ?.mapping
                );

            if (
                !taskId ||
                !mongoose.isValidObjectId(
                    taskId
                )
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Invalid correction task ID",
                    });
            }

            if (
                !importOfficerId ||
                !mongoose.isValidObjectId(
                    importOfficerId
                )
            ) {
                return res
                    .status(401)
                    .json({
                        success: false,
                        message:
                            "Authenticated Import Officer not found",
                    });
            }

            if (!file) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Corrected CSV or XLSX file is required",
                    });
            }

            if (
                importOfficerNote.length <
                3
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Briefly describe the source correction performed",
                    });
            }

            if (!mapping) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Valid column mapping is required",
                    });
            }

            const task =
                await DataCorrectionTask
                    .findById(
                        taskId
                    );

            if (!task) {
                return res
                    .status(404)
                    .json({
                        success: false,
                        message:
                            "Correction task not found",
                    });
            }

            if (
                !task.assignedTo ||
                task.assignedTo
                    .toString() !==
                    importOfficerId
            ) {
                return res
                    .status(403)
                    .json({
                        success: false,
                        message:
                            "This correction task is not assigned to you",
                    });
            }

            if (
                task.status !==
                "IN_PROGRESS"
            ) {
                return res
                    .status(409)
                    .json({
                        success: false,
                        message:
                            "Start the correction task before submitting a corrected upload",
                    });
            }

            const [
                originalUpload,
                originalIssue,
            ] =
                await Promise.all([
                    Upload.findById(
                        task.originalUploadId
                    ),

                    DataQualityIssue
                        .findById(
                            task.dataQualityIssueId
                        ),
                ]);

            if (!originalUpload) {
                return res
                    .status(409)
                    .json({
                        success: false,
                        message:
                            "Original banking upload is unavailable",
                    });
            }

            if (!originalIssue) {
                return res
                    .status(409)
                    .json({
                        success: false,
                        message:
                            "Linked Data Quality issue is unavailable",
                    });
            }

            /*
             * The corrected extract must remain
             * in the same source-system context.
             *
             * We deliberately DO NOT accept a
             * sourceSystem from the client here.
             */
            const sourceSystem =
                originalUpload
                    .sourceSystem;

            const fileHash =
                crypto
                    .createHash(
                        "sha256"
                    )
                    .update(
                        file.buffer
                    )
                    .digest("hex");

            const duplicateUpload =
                await Upload.findOne({
                    fileHash,
                })
                    .select(
                        "_id originalName status"
                    )
                    .lean();

            if (duplicateUpload) {
                return res
                    .status(409)
                    .json({
                        success: false,
                        message:
                            "This exact file already exists in BankSync. Submit a newly corrected source extract.",
                    });
            }

            let records:
                ParsedRecord[];

            try {
                records =
                    await parseUploadedFile(
                        file.buffer,
                        file.mimetype
                    );
            } catch (error) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            error instanceof
                                UploadHeaderError
                                ? error.message
                                : "Corrected file could not be read. Upload a valid CSV or .xlsx file with a header row and transaction rows",
                    });
            }

            if (
                records.length === 0
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Corrected file contains no transaction rows",
                    });
            }

            const mappingErrors =
                validateColumnMapping(
                    mapping,
                    Object.keys(
                        records[0] ??
                        {}
                    )
                );

            if (
                mappingErrors.length >
                0
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Column mapping does not match the corrected file",
                        errors:
                            mappingErrors,
                    });
            }

            const processed =
                processTransactionBatch(
                    records,
                    mapping
                );

            if (
                processed.validRows ===
                0
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Corrected file contains no valid transaction rows",
                        data: {
                            totalRows:
                                processed.totalRows,

                            validRows:
                                processed.validRows,

                            invalidRows:
                                processed.invalidRows,

                            validationErrors:
                                processed.validationErrors,

                            validationErrorsTruncated:
                                processed.validationErrorsTruncated,
                        },
                    });
            }

            const correctedUpload =
                await Upload.create({
                    fileName:
                        `${Date.now()}-${file.originalname}`,

                    originalName:
                        file.originalname,

                    fileHash,

                    sourceSystem,

                    uploadedBy:
                        new mongoose.Types.ObjectId(
                            importOfficerId
                        ),

                    status:
                        "PROCESSING",

                    totalRows:
                        processed.totalRows,

                    validRows:
                        processed.validRows,

                    invalidRows:
                        processed.invalidRows,

                    correctionOfUploadId:
                        originalUpload._id,

                    correctionTaskId:
                        task._id,
                });

            createdUploadId =
                correctedUpload._id;

            try {
                await saveTransactions(
                    correctedUpload._id,
                    sourceSystem,
                    processed.validRecords
                );

                if (
                    processed.invalidRows >
                    0
                ) {
                    const rejectedRows =
                        processed
                            .invalidRecords
                            .map(
                                (
                                    record
                                ) => ({
                                    uploadId:
                                        correctedUpload._id,

                                    recordNumber:
                                        record.recordNumber,

                                    rawRecord:
                                        record.rawRecord,

                                    validationIssues:
                                        record.errors.map(
                                            (
                                                issue
                                            ) => ({
                                                field:
                                                    issue.path
                                                        .map(
                                                            String
                                                        )
                                                        .join(
                                                            "."
                                                        ),

                                                message:
                                                    issue.message,
                                            })
                                        ),
                                })
                            );

                    await UploadRejectedRow
                        .insertMany(
                            rejectedRows
                        );
                }

                correctedUpload.status =
                    processed.invalidRows >
                    0
                        ? "PARTIALLY_VALIDATED"
                        : "VALIDATED";

                await correctedUpload.save();
            } catch (error) {
                if (
                    error instanceof
                    TransactionCleanupError
                ) {
                    throw error;
                }

                try {
                    await Transaction
                        .deleteMany({
                            uploadId:
                                correctedUpload._id,
                        });

                    await UploadRejectedRow
                        .deleteMany({
                            uploadId:
                                correctedUpload._id,
                        });

                    await Upload
                        .updateOne(
                            {
                                _id:
                                    correctedUpload._id,
                            },
                            {
                                $set: {
                                    status:
                                        "FAILED",
                                },
                            }
                        );
                } catch (
                    cleanupError
                ) {
                    console.error(
                        "Unable to clean up failed corrected upload:",
                        cleanupError
                    );
                }

                throw error;
            }

            /*
             * Persist the submission before
             * verification. This gives the
             * workflow a complete audit state.
             */
            const now =
                new Date();

            task.correctedUploadId =
                correctedUpload._id;

            task.submittedBy =
                new mongoose.Types.ObjectId(
                    importOfficerId
                );

            task.submittedAt =
                now;

            task.importOfficerNote =
                importOfficerNote;

            task.status =
                "CORRECTED_UPLOAD_SUBMITTED";

            task.verificationAttemptedAt =
                now;

            task.verificationFailureReason =
                "";

            originalIssue.status =
                "PENDING_VERIFICATION";

            originalIssue.verificationUploadId =
                correctedUpload._id;

            originalIssue.verificationAttemptedAt =
                now;

            await Promise.all([
                task.save(),
                originalIssue.save(),
            ]);

            await createBusinessAudit({
                actorId:
                    importOfficerId,

                actorRole,

                entityType:
                    "CASE",

                entityId:
                    task.caseId.toString(),

                action:
                    "CORRECTED_UPLOAD_SUBMITTED",

                description:
                    "Import Officer submitted a linked corrected source upload for automated Data Quality verification",

                metadata: {
                    correctionTaskId:
                        task._id.toString(),

                    originalUploadId:
                        originalUpload._id.toString(),

                    correctedUploadId:
                        correctedUpload._id.toString(),

                    originalIssueId:
                        originalIssue._id.toString(),

                    uploadStatus:
                        correctedUpload.status,

                    totalRows:
                        correctedUpload.totalRows,

                    validRows:
                        correctedUpload.validRows,

                    invalidRows:
                        correctedUpload.invalidRows,
                },
            });

            /*
             * ----------------------------------------
             * VALIDATION FAILURE
             * ----------------------------------------
             *
             * Current DQ scanner intentionally
             * scans only fully VALIDATED uploads.
             *
             * A partially validated correction
             * therefore fails correction
             * verification and returns to the
             * Import Officer.
             */
            if (
                correctedUpload.status !==
                "VALIDATED"
            ) {
                const failureReason =
                    `Corrected upload contains ${correctedUpload.invalidRows} rejected row(s). Submit a fully validated corrected extract before Data Quality verification.`;

                task.status =
                    "VERIFICATION_FAILED";

                task.verificationFailureReason =
                    failureReason;

                task.verifiedAt =
                    null;

                originalIssue.status =
                    "VERIFICATION_FAILED";

                originalIssue.verifiedResolvedAt =
                    null;

                await Promise.all([
                    task.save(),
                    originalIssue.save(),
                ]);

                await createBusinessAudit({
                    actorId:
                        importOfficerId,

                    actorRole,

                    entityType:
                        "CASE",

                    entityId:
                        task.caseId.toString(),

                    action:
                        "DATA_CORRECTION_VERIFICATION_FAILED",

                    description:
                        "Corrected upload failed verification because validation still contains rejected rows",

                    metadata: {
                        correctionTaskId:
                            task._id.toString(),

                        correctedUploadId:
                            correctedUpload._id.toString(),

                        failureReason,
                    },
                });

                return res
                    .status(200)
                    .json({
                        success: true,

                        message:
                            "Corrected upload saved, but verification failed",

                        data: {
                            taskStatus:
                                task.status,

                            verificationPassed:
                                false,

                            failureReason,

                            correctedUpload: {
                                _id:
                                    correctedUpload._id,

                                originalName:
                                    correctedUpload.originalName,

                                sourceSystem:
                                    correctedUpload.sourceSystem,

                                status:
                                    correctedUpload.status,

                                totalRows:
                                    correctedUpload.totalRows,

                                validRows:
                                    correctedUpload.validRows,

                                invalidRows:
                                    correctedUpload.invalidRows,
                            },
                        },
                    });
            }

            let scanResult:
                Awaited<
                    ReturnType<
                        typeof scanUploadDataQuality
                    >
                >;

            try {
                scanResult =
                    await scanUploadDataQuality(
                        correctedUpload._id.toString()
                    );
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : "Unknown verification error";

                const failureReason =
                    `BankSync could not complete automated Data Quality verification: ${message}`;

                task.status =
                    "VERIFICATION_FAILED";

                task.verificationFailureReason =
                    failureReason;

                task.verifiedAt =
                    null;

                originalIssue.status =
                    "VERIFICATION_FAILED";

                originalIssue.verifiedResolvedAt =
                    null;

                await Promise.all([
                    task.save(),
                    originalIssue.save(),
                ]);

                await createBusinessAudit({
                    actorId:
                        importOfficerId,

                    actorRole,

                    entityType:
                        "CASE",

                    entityId:
                        task.caseId.toString(),

                    action:
                        "DATA_CORRECTION_VERIFICATION_FAILED",

                    description:
                        "BankSync could not complete automated verification of the corrected upload",

                    metadata: {
                        correctionTaskId:
                            task._id.toString(),

                        correctedUploadId:
                            correctedUpload._id.toString(),

                        failureReason,
                    },
                });

                return res
                    .status(200)
                    .json({
                        success: true,

                        message:
                            "Corrected upload saved, but automated verification could not be completed",

                        data: {
                            taskStatus:
                                task.status,

                            verificationPassed:
                                false,

                            failureReason,

                            correctedUpload: {
                                _id:
                                    correctedUpload._id,

                                originalName:
                                    correctedUpload.originalName,

                                sourceSystem:
                                    correctedUpload.sourceSystem,

                                status:
                                    correctedUpload.status,
                            },
                        },
                    });
            }

            /*
             * Verify the ORIGINAL issue against
             * the corrected upload.
             *
             * The scanner creates upload-specific
             * issue records. Therefore the
             * original defect persists when the
             * corrected upload contains the same
             * issue type + detected key.
             */
            const repeatedIssue =
                await DataQualityIssue
                    .findOne({
                        uploadId:
                            correctedUpload._id,

                        issueType:
                            originalIssue.issueType,

                        keyValue:
                            originalIssue.keyValue,
                    })
                    .select(
                        "_id issueType keyValue description"
                    )
                    .lean();

            if (repeatedIssue) {
                const failureReason =
                    `BankSync still detects ${originalIssue.issueType} for key ${originalIssue.keyValue} in the corrected upload.`;

                task.status =
                    "VERIFICATION_FAILED";

                task.verificationFailureReason =
                    failureReason;

                task.verifiedAt =
                    null;

                originalIssue.status =
                    "VERIFICATION_FAILED";

                originalIssue.verifiedResolvedAt =
                    null;

                await Promise.all([
                    task.save(),
                    originalIssue.save(),
                ]);

                await createBusinessAudit({
                    actorId:
                        importOfficerId,

                    actorRole,

                    entityType:
                        "CASE",

                    entityId:
                        task.caseId.toString(),

                    action:
                        "DATA_CORRECTION_VERIFICATION_FAILED",

                    description:
                        "BankSync re-scan confirmed that the original Data Quality defect still exists",

                    metadata: {
                        correctionTaskId:
                            task._id.toString(),

                        correctedUploadId:
                            correctedUpload._id.toString(),

                        originalIssueId:
                            originalIssue._id.toString(),

                        repeatedIssueId:
                            repeatedIssue._id.toString(),

                        issueType:
                            originalIssue.issueType,

                        keyValue:
                            originalIssue.keyValue,

                        scanResult,

                        failureReason,
                    },
                });

                return res
                    .status(200)
                    .json({
                        success: true,

                        message:
                            "Corrected upload processed, but the original Data Quality defect still exists",

                        data: {
                            taskStatus:
                                task.status,

                            verificationPassed:
                                false,

                            failureReason,

                            scanResult,

                            correctedUpload: {
                                _id:
                                    correctedUpload._id,

                                originalName:
                                    correctedUpload.originalName,

                                sourceSystem:
                                    correctedUpload.sourceSystem,

                                status:
                                    correctedUpload.status,

                                totalRows:
                                    correctedUpload.totalRows,

                                validRows:
                                    correctedUpload.validRows,

                                invalidRows:
                                    correctedUpload.invalidRows,
                            },
                        },
                    });
            }

            /*
             * ----------------------------------------
             * VERIFIED RESOLVED
             * ----------------------------------------
             *
             * The original issue is no longer
             * detected in the corrected upload.
             */
            const verifiedAt =
                new Date();

            task.status =
                "VERIFIED_RESOLVED";

            task.verificationFailureReason =
                "";

            task.verifiedAt =
                verifiedAt;

            originalIssue.status =
                "VERIFIED_RESOLVED";

            originalIssue.verifiedResolvedAt =
                verifiedAt;

            await Promise.all([
                task.save(),
                originalIssue.save(),
            ]);

            await createBusinessAudit({
                actorId:
                    importOfficerId,

                actorRole,

                entityType:
                    "CASE",

                entityId:
                    task.caseId.toString(),

                action:
                    "DATA_CORRECTION_VERIFIED_RESOLVED",

                description:
                    "BankSync automatically verified that the original Data Quality defect no longer exists in the corrected upload",

                metadata: {
                    correctionTaskId:
                        task._id.toString(),

                    originalUploadId:
                        originalUpload._id.toString(),

                    correctedUploadId:
                        correctedUpload._id.toString(),

                    originalIssueId:
                        originalIssue._id.toString(),

                    issueType:
                        originalIssue.issueType,

                    keyValue:
                        originalIssue.keyValue,

                    scanResult,

                    verifiedAt,
                },
            });

            return res
                .status(201)
                .json({
                    success: true,

                    message:
                        "Corrected upload verified successfully. The original Data Quality issue is now verified resolved.",

                    data: {
                        taskStatus:
                            task.status,

                        verificationPassed:
                            true,

                        verifiedAt,

                        scanResult,

                        correctedUpload: {
                            _id:
                                correctedUpload._id,

                            originalName:
                                correctedUpload.originalName,

                            sourceSystem:
                                correctedUpload.sourceSystem,

                            status:
                                correctedUpload.status,

                            totalRows:
                                correctedUpload.totalRows,

                            validRows:
                                correctedUpload.validRows,

                            invalidRows:
                                correctedUpload.invalidRows,

                            correctionOfUploadId:
                                correctedUpload.correctionOfUploadId,

                            correctionTaskId:
                                correctedUpload.correctionTaskId,
                        },
                    },
                });
        } catch (error) {
            /*
             * If upload creation succeeded but
             * the import failed before normal
             * workflow handling, mark the upload
             * FAILED without deleting the original.
             */
            if (createdUploadId) {
                try {
                    await Transaction.deleteMany({
                        uploadId:
                            createdUploadId,
                    });

                    await UploadRejectedRow.deleteMany({
                        uploadId:
                            createdUploadId,
                    });

                    await Upload.updateOne(
                        {
                            _id:
                                createdUploadId,
                        },
                        {
                            $set: {
                                status:
                                    "FAILED",
                            },
                        }
                    );
                } catch (
                    cleanupError
                ) {
                    console.error(
                        "Unable to clean up corrected upload after error:",
                        cleanupError
                    );
                }
            }

            if (
                error instanceof
                    mongoose.mongo
                        .MongoServerError &&
                error.code === 11000 &&
                error.keyPattern
                    ?.fileHash
            ) {
                return res
                    .status(409)
                    .json({
                        success: false,
                        message:
                            "This exact file already exists in BankSync",
                    });
            }

            console.error(
                "Submit corrected upload error:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,
                    message:
                        "Unable to upload and verify the corrected source extract",
                });
        }
    };
