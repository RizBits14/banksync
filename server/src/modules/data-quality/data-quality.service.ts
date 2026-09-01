import { Upload } from "../uploads/upload.model.js";
import { Transaction } from "../transactions/transaction.model.js";

import { DataQualityIssue } from "./data-quality.model.js";

const makeFingerprint = (
    uploadId: string,
    issueType: string,
    key: string
) => {
    return `${uploadId}:${issueType}:${key}`;
};

const amountToNumber = (
    amount: unknown
) => {
    if (
        amount &&
        typeof amount === "object" &&
        "toString" in amount
    ) {
        return Number(
            (
                amount as {
                    toString: () => string;
                }
            ).toString()
        );
    }

    return Number(amount);
};

export const scanUploadDataQuality =
    async (uploadId: string) => {
        const upload =
            await Upload.findById(uploadId);

        if (!upload) {
            throw new Error("Upload not found");
        }

        const transactions =
            (await Transaction.find({
                uploadId,
            })
                .sort({
                    transactionDate: 1,
                })
                .lean()) as any[];

        const detectedIssues: any[] = [];

        /*
         * --------------------------------
         * Duplicate Transaction IDs
         * --------------------------------
         */

        const transactionIdGroups =
            new Map<string, any[]>();

        for (const transaction of transactions) {
            const key =
                transaction.transactionId?.trim();

            if (!key) {
                continue;
            }

            const existing =
                transactionIdGroups.get(key) || [];

            existing.push(transaction);

            transactionIdGroups.set(
                key,
                existing
            );
        }

        for (const [
            transactionId,
            group,
        ] of transactionIdGroups) {
            if (group.length <= 1) {
                continue;
            }

            detectedIssues.push({
                uploadId: upload._id,

                sourceSystem:
                    group[0].sourceSystem,

                issueType:
                    "DUPLICATE_TRANSACTION_ID",

                severity: "HIGH",

                primaryTransactionId:
                    group[0]._id,

                relatedTransactionIds:
                    group.map(
                        (transaction) =>
                            transaction._id
                    ),

                keyValue: transactionId,

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
         * --------------------------------
         * Duplicate Reference Numbers
         * --------------------------------
         */

        const referenceGroups =
            new Map<string, any[]>();

        for (const transaction of transactions) {
            const reference =
                transaction.referenceNumber?.trim();

            if (!reference) {
                continue;
            }

            const existing =
                referenceGroups.get(
                    reference
                ) || [];

            existing.push(transaction);

            referenceGroups.set(
                reference,
                existing
            );
        }

        for (const [
            reference,
            group,
        ] of referenceGroups) {
            if (group.length <= 1) {
                continue;
            }

            detectedIssues.push({
                uploadId: upload._id,

                sourceSystem:
                    group[0].sourceSystem,

                issueType:
                    "DUPLICATE_REFERENCE",

                severity: "MEDIUM",

                primaryTransactionId:
                    group[0]._id,

                relatedTransactionIds:
                    group.map(
                        (transaction) =>
                            transaction._id
                    ),

                keyValue: reference,

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
         * --------------------------------
         * Reversal Checks
         * --------------------------------
         */

        const reversedTransactions =
            transactions.filter(
                (transaction) =>
                    transaction.status ===
                    "REVERSED"
            );

        for (
            const reversal
            of reversedTransactions
        ) {
            const reversalReference =
                reversal.referenceNumber?.trim();

            const reversalTransactionId =
                reversal.transactionId?.trim();

            const candidateOriginals =
                transactions.filter(
                    (transaction) => {
                        if (
                            transaction._id.toString() ===
                            reversal._id.toString()
                        ) {
                            return false;
                        }

                        if (
                            transaction.status !==
                            "SUCCESS"
                        ) {
                            return false;
                        }

                        if (
                            reversalReference &&
                            transaction.referenceNumber ===
                            reversalReference
                        ) {
                            return true;
                        }

                        if (
                            !reversalReference &&
                            reversalTransactionId &&
                            transaction.transactionId ===
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

            if (
                candidateOriginals.length === 0
            ) {
                detectedIssues.push({
                    uploadId: upload._id,

                    sourceSystem:
                        reversal.sourceSystem,

                    issueType:
                        "REVERSAL_WITHOUT_ORIGINAL",

                    severity: "HIGH",

                    primaryTransactionId:
                        reversal._id,

                    relatedTransactionIds: [
                        reversal._id,
                    ],

                    keyValue: reversalKey,

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

            const reversalAmount =
                amountToNumber(
                    reversal.amount
                );

            const amountMatches =
                candidateOriginals.some(
                    (original) =>
                        amountToNumber(
                            original.amount
                        ) === reversalAmount
                );

            if (!amountMatches) {
                detectedIssues.push({
                    uploadId: upload._id,

                    sourceSystem:
                        reversal.sourceSystem,

                    issueType:
                        "REVERSAL_AMOUNT_MISMATCH",

                    severity: "HIGH",

                    primaryTransactionId:
                        reversal._id,

                    relatedTransactionIds: [
                        reversal._id,
                        ...candidateOriginals.map(
                            (transaction) =>
                                transaction._id
                        ),
                    ],

                    keyValue: reversalKey,

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
         * --------------------------------
         * Idempotent database update
         * --------------------------------
         */

        const activeFingerprints =
            detectedIssues.map(
                (issue) =>
                    issue.fingerprint
            );

        if (
            activeFingerprints.length > 0
        ) {
            await DataQualityIssue.deleteMany({
                uploadId,
                fingerprint: {
                    $nin: activeFingerprints,
                },
            });

            await DataQualityIssue.bulkWrite(
                detectedIssues.map(
                    (issue) => ({
                        updateOne: {
                            filter: {
                                fingerprint:
                                    issue.fingerprint,
                            },

                            update: {
                                $set: issue,
                            },

                            upsert: true,
                        },
                    })
                )
            );
        } else {
            await DataQualityIssue.deleteMany({
                uploadId,
            });
        }

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