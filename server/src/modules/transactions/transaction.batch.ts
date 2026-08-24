import type { ColumnMapping } from "../uploads/upload.mapper.js";
import { mapTransactionRecord } from "../uploads/upload.mapper.js";
import { processTransactionRow } from "./transaction.processor.js";

export const processTransactionBatch = (
    records: Record<string, unknown>[],
    mapping: ColumnMapping
) => {
    const validRecords = [];
    const invalidRecords = [];

    for (const record of records) {
        const mappedRecord = mapTransactionRecord(
            record,
            mapping
        );

        const result = processTransactionRow(
            mappedRecord
        );

        if (result.success) {
            validRecords.push(result);
        } else {
            invalidRecords.push(result);
        }
    }

    return {
        totalRows: records.length,
        validRows: validRecords.length,
        invalidRows: invalidRecords.length,
        validRecords,
        invalidRecords,
    };
};