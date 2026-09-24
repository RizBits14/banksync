import {
    Upload,
} from "../uploads/upload.model.js";

import {
    Transaction,
} from "../transactions/transaction.model.js";

import {
    DataQualityIssue,
} from "./data-quality.model.js";

import {
    areAmountsEqual,
} from "../reconciliation/reconciliation.amount.js";

/*
 * ----------------------------------------
 * UPLOAD NOT READY ERROR
 * ----------------------------------------
 */
export class UploadNotReadyError extends Error {
    constructor() {
        super(
            "Upload must be fully processed before a data quality scan"
        );

        this.name =
            "UploadNotReadyError";
    }
}

/*
 * ----------------------------------------
 * ISSUE FINGERPRINT
 * ----------------------------------------
 *
 * A fingerprint prevents the same issue
 * from being created repeatedly when the
 * same upload is scanned more than once.
 *
 * Important:
 *
 * The upload ID is intentionally included.
 * A corrected replacement upload is a new
 * upload and therefore has its own issues.
 *
 * Later, BankSync will separately verify
 * the ORIGINAL issue against the corrected
 * upload.
 */
const makeFingerprint = (
    uploadId: string,
    issueType: string,
    key: string
) => {
    return `${uploadId}:${issueType}:${key}`;
};

/*
 * ----------------------------------------
 * SCAN UPLOAD DATA QUALITY
 * ----------------------------------------
 */
export const scanUploadDataQuality =
    async (
        uploadId: string
    ) => {
        /*
         * Load the upload first.
         */
        const upload =
            await Upload.findById(
                uploadId
            );

        if (!upload) {
            throw new Error(
                "Upload not found"
            );
        }

        /*
         * Only fully imported transaction
         * datasets can be scanned.
         *
         * PARTIALLY_VALIDATED uploads are
         * intentionally excluded for now.
         */
        if (
            upload.status !==
                "VALIDATED" &&
            upload.status !==
                "COMPLETED"
        ) {
            throw new UploadNotReadyError();
        }

        /*
         * Load all imported transactions
         * belonging to this upload.
         */
        const transactions = (
            await Transaction.find({
                uploadId,
            })
                .sort({
                    transactionDate: 1,
                })
                .lean()
        ) as any[];

        const detectedIssues:
            any[] = [];

        /*
         * ========================================
         * 1. DUPLICATE TRANSACTION IDs
         * ========================================
         */
        const transactionIdGroups =
            new Map<
                string,
                any[]
            >();

        for (
            const transaction
            of transactions
        ) {
            const key =
                transaction
                    .transactionId
                    ?.trim();

            if (!key) {
                continue;
            }

            const existing =
                transactionIdGroups.get(
                    key
                ) || [];

            existing.push(
                transaction
            );

            transactionIdGroups.set(
                key,
                existing
            );
        }

        for (
            const [
                transactionId,
                group,
            ] of transactionIdGroups
        ) {
            if (
                group.length <= 1
            ) {
                continue;
            }

            detectedIssues.push({
                uploadId:
                    upload._id,

                sourceSystem:
                    group[0]
                        .sourceSystem,

                issueType:
                    "DUPLICATE_TRANSACTION_ID",

                severity:
                    "HIGH",

                primaryTransactionId:
                    group[0]._id,

                relatedTransactionIds:
                    group.map(
                        (
                            transaction
                        ) =>
                            transaction._id
                    ),

                keyValue:
                    transactionId,

                description:
                    `Transaction ID ${transactionId} appears ${group.length} times in the same upload.`,

                fingerprint:
                    makeFingerprint(
                        uploadId,
                        "DUPLICATE_TRANSACTION_ID",
                        transactionId
                    ),
            });
        }

        /*
         * ========================================
         * 2. DUPLICATE REFERENCE NUMBERS
         * ========================================
         */
        const referenceGroups =
            new Map<
                string,
                any[]
            >();

        for (
            const transaction
            of transactions
        ) {
            const reference =
                transaction
                    .referenceNumber
                    ?.trim();

            if (!reference) {
                continue;
            }

            const existing =
                referenceGroups.get(
                    reference
                ) || [];

            existing.push(
                transaction
            );

            referenceGroups.set(
                reference,
                existing
            );
        }

        for (
            const [
                reference,
                group,
            ] of referenceGroups
        ) {
            if (
                group.length <= 1
            ) {
                continue;
            }

            detectedIssues.push({
                uploadId:
                    upload._id,

                sourceSystem:
                    group[0]
                        .sourceSystem,

                issueType:
                    "DUPLICATE_REFERENCE",

                severity:
                    "MEDIUM",

                primaryTransactionId:
                    group[0]._id,

                relatedTransactionIds:
                    group.map(
                        (
                            transaction
                        ) =>
                            transaction._id
                    ),

                keyValue:
                    reference,

                description:
                    `Reference ${reference} appears ${group.length} times in the same upload.`,

                fingerprint:
                    makeFingerprint(
                        uploadId,
                        "DUPLICATE_REFERENCE",
                        reference
                    ),
            });
        }

        /*
         * ========================================
         * 3. REVERSAL CHECKS
         * ========================================
         */
        const reversedTransactions =
            transactions.filter(
                (
                    transaction
                ) =>
                    transaction.status ===
                    "REVERSED"
            );

        for (
            const reversal
            of reversedTransactions
        ) {
            const reversalReference =
                reversal
                    .referenceNumber
                    ?.trim();

            const reversalTransactionId =
                reversal
                    .transactionId
                    ?.trim();

            /*
             * Locate successful candidate
             * originals from the same upload.
             */
            const candidateOriginals =
                transactions.filter(
                    (
                        transaction
                    ) => {
                        if (
                            transaction
                                ._id
                                .toString() ===
                            reversal
                                ._id
                                .toString()
                        ) {
                            return false;
                        }

                        if (
                            transaction
                                .status !==
                            "SUCCESS"
                        ) {
                            return false;
                        }

                        if (
                            reversalReference &&
                            transaction
                                .referenceNumber ===
                                reversalReference
                        ) {
                            return true;
                        }

                        if (
                            !reversalReference &&
                            reversalTransactionId &&
                            transaction
                                .transactionId ===
                                reversalTransactionId
                        ) {
                            return true;
                        }

                        return false;
                    }
                );

            const reversalKey =
                reversalReference ||
                reversalTransactionId ||
                reversal._id.toString();

            /*
             * No successful original exists.
             */
            if (
                candidateOriginals
                    .length === 0
            ) {
                detectedIssues.push({
                    uploadId:
                        upload._id,

                    sourceSystem:
                        reversal
                            .sourceSystem,

                    issueType:
                        "REVERSAL_WITHOUT_ORIGINAL",

                    severity:
                        "HIGH",

                    primaryTransactionId:
                        reversal._id,

                    relatedTransactionIds:
                        [
                            reversal._id,
                        ],

                    keyValue:
                        reversalKey,

                    description:
                        "Reversed transaction does not have a corresponding successful original transaction.",

                    fingerprint:
                        makeFingerprint(
                            uploadId,
                            "REVERSAL_WITHOUT_ORIGINAL",
                            reversal._id.toString()
                        ),
                });

                continue;
            }

            /*
             * Original exists, but the reversal
             * amount may not match.
             */
            const amountMatches =
                candidateOriginals.some(
                    (
                        original
                    ) =>
                        areAmountsEqual(
                            original.amount.toString(),
                            reversal.amount.toString()
                        )
                );

            if (
                !amountMatches
            ) {
                detectedIssues.push({
                    uploadId:
                        upload._id,

                    sourceSystem:
                        reversal
                            .sourceSystem,

                    issueType:
                        "REVERSAL_AMOUNT_MISMATCH",

                    severity:
                        "HIGH",

                    primaryTransactionId:
                        reversal._id,

                    relatedTransactionIds:
                        [
                            reversal._id,

                            ...candidateOriginals.map(
                                (
                                    transaction
                                ) =>
                                    transaction._id
                            ),
                        ],

                    keyValue:
                        reversalKey,

                    description:
                        "Reversal amount does not match the corresponding original transaction amount.",

                    fingerprint:
                        makeFingerprint(
                            uploadId,
                            "REVERSAL_AMOUNT_MISMATCH",
                            reversal._id.toString()
                        ),
                });
            }
        }

        /*
         * ========================================
         * PRESERVE + UPDATE DETECTED ISSUES
         * ========================================
         *
         * IMPORTANT:
         *
         * We NO LONGER delete historical issues
         * simply because a later scan does not
         * detect them.
         *
         * Original issue records are evidence
         * and must remain available for:
         *
         * - investigation
         * - checker review
         * - correction workflow
         * - audit history
         * - verification
         *
         * Also notice that we do NOT set
         * "status" here.
         *
         * Therefore rescanning an issue that is
         * UNDER_REVIEW or CORRECTION_REQUIRED
         * does not accidentally reset it to OPEN.
         */
        if (
            detectedIssues.length >
            0
        ) {
            await DataQualityIssue.bulkWrite(
                detectedIssues.map(
                    (issue) => ({
                        updateOne: {
                            filter: {
                                fingerprint:
                                    issue.fingerprint,
                            },

                            update: {
                                /*
                                 * Update current evidence
                                 * without touching workflow
                                 * status or Case links.
                                 */
                                $set: {
                                    uploadId:
                                        issue.uploadId,

                                    sourceSystem:
                                        issue.sourceSystem,

                                    issueType:
                                        issue.issueType,

                                    severity:
                                        issue.severity,

                                    primaryTransactionId:
                                        issue.primaryTransactionId,

                                    relatedTransactionIds:
                                        issue.relatedTransactionIds,

                                    keyValue:
                                        issue.keyValue,

                                    description:
                                        issue.description,
                                },

                                /*
                                 * Only newly discovered
                                 * problems start as OPEN.
                                 */
                                $setOnInsert: {
                                    fingerprint:
                                        issue.fingerprint,

                                    status:
                                        "OPEN",
                                },
                            },

                            upsert: true,
                        },
                    })
                )
            );
        }

        /*
         * ========================================
         * RETURN SCAN RESULT
         * ========================================
         */
        return {
            scannedTransactions:
                transactions.length,

            detectedIssues:
                detectedIssues.length,

            duplicateTransactionIds:
                detectedIssues.filter(
                    (issue) =>
                        issue.issueType ===
                        "DUPLICATE_TRANSACTION_ID"
                ).length,

            duplicateReferences:
                detectedIssues.filter(
                    (issue) =>
                        issue.issueType ===
                        "DUPLICATE_REFERENCE"
                ).length,

            reversalWithoutOriginal:
                detectedIssues.filter(
                    (issue) =>
                        issue.issueType ===
                        "REVERSAL_WITHOUT_ORIGINAL"
                ).length,

            reversalAmountMismatch:
                detectedIssues.filter(
                    (issue) =>
                        issue.issueType ===
                        "REVERSAL_AMOUNT_MISMATCH"
                ).length,
        };
    };