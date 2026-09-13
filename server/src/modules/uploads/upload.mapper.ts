export interface ColumnMapping {
    transactionId: string;
    referenceNumber?: string;
    accountNumber?: string;
    amount: string;
    transactionDate: string;
    status: string;
}

export const validateColumnMapping = (
    mapping: ColumnMapping,
    availableColumns: string[]
) => {
    const columns = new Set(availableColumns);
    const errors = [];

    for (const [field, column] of Object.entries(mapping)) {
        if (column && !columns.has(column)) {
            errors.push({
                field,
                column,
                message:
                    `Column "${column}" was not found in the uploaded file`,
            });
        }
    }

    return errors;
};

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