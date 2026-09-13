import { parse } from "csv-parse/sync";
import { readSheet } from "read-excel-file/node";

export type ParsedRecord = Record<string, unknown>;

export class UploadHeaderError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "UploadHeaderError";
    }
}

const normalizeHeaders = (values: unknown[]): string[] => {
    const headers = values.map((value) =>
        String(value ?? "").trim()
    );

    const seen = new Set<string>();

    for (const header of headers) {
        if (!header) {
            throw new UploadHeaderError(
                "Every column must have a non-empty header name"
            );
        }

        if (seen.has(header)) {
            throw new UploadHeaderError(
                `Duplicate column header: ${header}`
            );
        }

        seen.add(header);
    }

    return headers;
};

export const parseCsvFile = (
    buffer: Buffer
): ParsedRecord[] => {
    const content = buffer.toString("utf-8");

    return parse(content, {
        bom: true,
        columns: (headers: string[]) => normalizeHeaders(headers),
        skip_empty_lines: true,
        trim: true,
    }) as ParsedRecord[];
};

export const parseExcelFile = async (
    buffer: Buffer
): Promise<ParsedRecord[]> => {
    const rows = await readSheet(buffer, {
        parseNumber: (value) => value,
    });

    if (rows.length === 0) {
        throw new Error("Excel file contains no rows");
    }

    const headerRow = rows[0];

    if (!headerRow) {
        throw new Error("Excel file contains no header row");
    }

    const headers = normalizeHeaders(headerRow);

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