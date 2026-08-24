import { parse } from "csv-parse/sync";
import { readSheet } from "read-excel-file/node";

export type ParsedRecord = Record<string, unknown>;

export const parseCsvFile = (
    buffer: Buffer
): ParsedRecord[] => {
    const content = buffer.toString("utf-8");

    return parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    }) as ParsedRecord[];
};

export const parseExcelFile = async (
    buffer: Buffer
): Promise<ParsedRecord[]> => {
    const rows = await readSheet(buffer);

    if (rows.length === 0) {
        throw new Error("Excel file contains no rows");
    }

    const headerRow = rows[0];

    if (!headerRow) {
        throw new Error("Excel file contains no header row");
    }

    const headers: string[] = headerRow.map((value) =>
        String(value ?? "").trim()
    );

    const records: ParsedRecord[] = [];

    for (const row of rows.slice(1)) {
        const record: ParsedRecord = {};

        headers.forEach((header, index) => {
            if (header) {
                record[header] = row[index] ?? null;
            }
        });

        records.push(record);
    }

    return records;
};

export const parseUploadedFile = async (
    buffer: Buffer,
    mimetype: string
): Promise<ParsedRecord[]> => {
    if (mimetype === "text/csv") {
        return parseCsvFile(buffer);
    }

    if (
        mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
        return parseExcelFile(buffer);
    }

    throw new Error("Unsupported file type");
};