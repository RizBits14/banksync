import {
    normalizeAccountNumber,
    normalizeAmount,
    normalizeReference,
    normalizeStatus,
    normalizeTransactionDate,
    normalizeTransactionId,
} from "./transaction.normalizer.js";

import { transactionRowSchema } from "./transaction.validation.js";

export const processTransactionRow = (
    record: Record<string, unknown>
) => {
    const normalizedRecord = {
        transactionId: normalizeTransactionId(
            record.transactionId
        ),

        referenceNumber: normalizeReference(
            record.referenceNumber
        ),

        accountNumber: normalizeAccountNumber(
            record.accountNumber
        ),

        amount: normalizeAmount(
            record.amount
        ),

        transactionDate: normalizeTransactionDate(
            record.transactionDate
        ),

        status: normalizeStatus(
            record.status
        ),
    };

    const result = transactionRowSchema.safeParse(
        normalizedRecord
    );

    if (!result.success) {
        return {
            success: false as const,
            errors: result.error.issues,
            rawRecord: record,
            normalizedRecord,
        };
    }

    return {
        success: true as const,
        data: result.data,
        rawRecord: record,
        normalizedRecord,
    };
};