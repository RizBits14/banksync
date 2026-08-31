import { Transaction } from "../transactions/transaction.model.js";

export const runExactMatching = async (
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

    for (const source of sourceTransactions) {
        const target = targetTransactions.find(
            (item) =>
                item.transactionId === source.transactionId
        );

        if (!target) {
            unmatchedCount++;
            continue;
        }

        const amountMatches =
            target.amount.toString() === source.amount.toString();

        const statusMatches =
            target.status === source.status;

        if (amountMatches && statusMatches) {
            matchedCount++;
        } else {
            mismatchCount++;
        }
    }

    return {
        totalTransactions: sourceTransactions.length,
        matchedCount,
        mismatchCount,
        unmatchedCount,
    };
};