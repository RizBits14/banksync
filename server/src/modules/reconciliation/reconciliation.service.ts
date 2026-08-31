import mongoose from "mongoose";

import { Transaction } from "../transactions/transaction.model.js";
import { ReconciliationResult } from "./reconciliation-result.model.js";
import { calculateProbableMatchScore } from "./reconciliation.probable.js";

const PROBABLE_MATCH_THRESHOLD = 75;

export const runExactMatching = async (
    reconciliationId: mongoose.Types.ObjectId,
    sourceUploadId: string,
    targetUploadId: string
) => {
    const sourceTransactions = await Transaction.find({
        uploadId: sourceUploadId,
    });

    const targetTransactions = await Transaction.find({
        uploadId: targetUploadId,
    });

    let matchedCount = 0;
    let probableMatchCount = 0;
    let mismatchCount = 0;
    let unmatchedCount = 0;

    const results = [];

    const usedTargetIds = new Set<string>();

    for (const source of sourceTransactions) {
        // First priority: exact Transaction ID
        const exactTarget = targetTransactions.find(
            (target) =>
                target.transactionId === source.transactionId
        );

        if (exactTarget) {
            usedTargetIds.add(exactTarget._id.toString());

            const amountMatches =
                exactTarget.amount.toString() ===
                source.amount.toString();

            const statusMatches =
                exactTarget.status === source.status;

            let resultType:
                | "MATCHED"
                | "AMOUNT_MISMATCH"
                | "STATUS_MISMATCH"
                | "AMOUNT_AND_STATUS_MISMATCH";

            if (amountMatches && statusMatches) {
                matchedCount++;
                resultType = "MATCHED";
            } else {
                mismatchCount++;

                if (!amountMatches && !statusMatches) {
                    resultType =
                        "AMOUNT_AND_STATUS_MISMATCH";
                } else if (!amountMatches) {
                    resultType = "AMOUNT_MISMATCH";
                } else {
                    resultType = "STATUS_MISMATCH";
                }
            }

            results.push({
                reconciliationId,
                sourceTransactionId: source._id,
                targetTransactionId: exactTarget._id,
                result: resultType,
                matchScore: null,
            });

            continue;
        }

        // No exact transaction ID → try probable matching
        let bestTarget = null;
        let bestScore = 0;

        for (const target of targetTransactions) {
            if (usedTargetIds.has(target._id.toString())) {
                continue;
            }

            const score = calculateProbableMatchScore(
                {
                    referenceNumber: source.referenceNumber,
                    accountNumber: source.accountNumber,
                    amount: Number(source.amount.toString()),
                    transactionDate: source.transactionDate,
                },
                {
                    referenceNumber: target.referenceNumber,
                    accountNumber: target.accountNumber,
                    amount: Number(target.amount.toString()),
                    transactionDate: target.transactionDate,
                }
            );

            if (score > bestScore) {
                bestScore = score;
                bestTarget = target;
            }
        }

        if (
            bestTarget &&
            bestScore >= PROBABLE_MATCH_THRESHOLD
        ) {
            probableMatchCount++;

            usedTargetIds.add(bestTarget._id.toString());

            results.push({
                reconciliationId,
                sourceTransactionId: source._id,
                targetTransactionId: bestTarget._id,
                result: "PROBABLE_MATCH",
                matchScore: bestScore,
            });

            continue;
        }

        unmatchedCount++;

        results.push({
            reconciliationId,
            sourceTransactionId: source._id,
            targetTransactionId: null,
            result: "UNMATCHED",
            matchScore: bestScore || null,
        });
    }

    if (results.length > 0) {
        await ReconciliationResult.insertMany(results);
    }

    return {
        totalTransactions: sourceTransactions.length,
        matchedCount,
        probableMatchCount,
        mismatchCount,
        unmatchedCount,
    };
};