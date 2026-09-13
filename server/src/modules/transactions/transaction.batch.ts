import type { ColumnMapping } from "../uploads/upload.mapper.js";
import { mapTransactionRecord } from "../uploads/upload.mapper.js";
import { processTransactionRow } from "./transaction.processor.js";

const MAX_VALIDATION_ERROR_RECORDS = 100;

export const processTransactionBatch = (
    records: Record<string, unknown>[],
    mapping: ColumnMapping
) => {
    const validRecords = [];
    const invalidRecords = [];

    for (const [index, record] of records.entries()) {
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
            invalidRecords.push({
                ...result,
                recordNumber: index + 1,
            });
        }
    }

    const validationErrors = invalidRecords
        .slice(0, MAX_VALIDATION_ERROR_RECORDS)
        .map((record) => ({
            recordNumber: record.recordNumber,
            errors: record.errors.map((issue) => ({
                field: issue.path.map(String).join("."),
                message: issue.message,
            })),
        }));

    return {
        totalRows: records.length,
        validRows: validRecords.length,
        invalidRows: invalidRecords.length,
        validRecords,
        invalidRecords,
        validationErrors,
        validationErrorsTruncated:
            invalidRecords.length > MAX_VALIDATION_ERROR_RECORDS,
    };
};