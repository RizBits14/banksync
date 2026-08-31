import mongoose from "mongoose";

import { Transaction } from "../transactions/transaction.model.js";
import { ReconciliationResult } from "./reconciliation-result.model.js";

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
    let mismatchCount = 0;
    let unmatchedCount = 0;

    const results = [];

    for (const source of sourceTransactions) {
        const target = targetTransactions.find(
            (item) =>
                item.transactionId === source.transactionId
        );

        if (!target) {
            unmatchedCount++;

            results.push({
                reconciliationId,
                sourceTransactionId: source._id,
                targetTransactionId: null,
                result: "UNMATCHED",
            });

            continue;
        }

        const amountMatches =
            target.amount.toString() === source.amount.toString();

        const statusMatches =
            target.status === source.status;

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
                resultType = "AMOUNT_AND_STATUS_MISMATCH";
            } else if (!amountMatches) {
                resultType = "AMOUNT_MISMATCH";
            } else {
                resultType = "STATUS_MISMATCH";
            }
        }

        results.push({
            reconciliationId,
            sourceTransactionId: source._id,
            targetTransactionId: target._id,
            result: resultType,
        });
    }

    if (results.length > 0) {
        await ReconciliationResult.insertMany(results);
    }

    return {
        totalTransactions: sourceTransactions.length,
        matchedCount,
        mismatchCount,
        unmatchedCount,
    };
};