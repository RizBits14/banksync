import mongoose from "mongoose";

import { Transaction } from "./transaction.model.js";
import type { SourceSystem } from "../uploads/upload.model.js";

interface ValidProcessedRecord {
    data: {
        transactionId: string;
        referenceNumber?: string;
        accountNumber?: string;
        amount: number;
        transactionDate: Date;
        status: "SUCCESS" | "FAILED" | "PENDING" | "REVERSED";
    };
    rawRecord: Record<string, unknown>;
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

    return Transaction.insertMany(transactions);
};