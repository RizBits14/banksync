import {
    normalizeAccountNumber,
    normalizeReference,
    normalizeStatus,
} from "./transaction.normalizer.js";

import { transactionRowSchema } from "./transaction.validation.js";

export const processTransactionRow = (
    record: Record<string, unknown>
) => {
    const normalizedRecord = {
        transactionId: String(record.transactionId ?? "").trim(),

        referenceNumber: normalizeReference(
            record.referenceNumber
        ),

        accountNumber: normalizeAccountNumber(
            record.accountNumber
        ),

        amount: record.amount,

        transactionDate: record.transactionDate,

        status: normalizeStatus(record.status),
    };

    const result = transactionRowSchema.safeParse(
        normalizedRecord
    );

    if (!result.success) {
        return {
            success: false as const,
            errors: result.error.issues,
            rawRecord: record,
        };
    }

    return {
        success: true as const,
        data: result.data,
        rawRecord: record,
    };
};