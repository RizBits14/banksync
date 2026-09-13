import mongoose from "mongoose";

import { Transaction } from "./transaction.model.js";
import type { SourceSystem } from "../uploads/upload.model.js";

interface ValidProcessedRecord {
    data: {
        transactionId: string;
        referenceNumber?: string;
        accountNumber?: string;
        amount: string;
        transactionDate: Date;
        status: "SUCCESS" | "FAILED" | "PENDING" | "REVERSED";
    };
    rawRecord: Record<string, unknown>;
}

export class TransactionCleanupError extends Error {
    constructor(saveError: unknown, cleanupError: unknown) {
        super(
            "Transaction saving failed and partial rows could not be removed",
            {
                cause: new AggregateError(
                    [saveError, cleanupError],
                    "Transaction save and cleanup failed"
                ),
            }
        );

        this.name = "TransactionCleanupError";
    }
}

export const saveTransactions = async (
    uploadId: mongoose.Types.ObjectId,
    sourceSystem: SourceSystem,
    records: ValidProcessedRecord[]
) => {
    const transactions = records.map((record) => ({
        uploadId,
        sourceSystem,

        transactionId: record.data.transactionId,
        referenceNumber: record.data.referenceNumber,
        accountNumber: record.data.accountNumber,
        amount: record.data.amount,
        transactionDate: record.data.transactionDate,
        status: record.data.status,

        rawRecord: record.rawRecord,
    }));

    try {
        return await Transaction.insertMany(transactions);
    } catch (saveError) {
        try {
            await Transaction.deleteMany({ uploadId });
        } catch (cleanupError) {
            throw new TransactionCleanupError(
                saveError,
                cleanupError
            );
        }

        throw saveError;
    }
};