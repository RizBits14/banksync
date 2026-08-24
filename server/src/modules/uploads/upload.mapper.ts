export interface ColumnMapping {
    transactionId: string;
    referenceNumber?: string;
    accountNumber?: string;
    amount: string;
    transactionDate: string;
    status: string;
}

export const mapTransactionRecord = (
    record: Record<string, unknown>,
    mapping: ColumnMapping
) => {
    return {
        transactionId: record[mapping.transactionId],

        referenceNumber: mapping.referenceNumber
            ? record[mapping.referenceNumber]
            : undefined,

        accountNumber: mapping.accountNumber
            ? record[mapping.accountNumber]
            : undefined,

        amount: record[mapping.amount],

        transactionDate: record[mapping.transactionDate],

        status: record[mapping.status],
    };
};