import ExcelJS from "exceljs";
import { parse } from "csv-parse/sync";

export const parseCsvFile = (buffer: Buffer) => {
    const content = buffer.toString("utf-8");

    return parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    });
};

export const parseExcelFile = async (buffer: Buffer) => {
    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
        throw new Error("Excel file contains no worksheet");
    }

    const headers: string[] = [];
    const records: Record<string, unknown>[] = [];

    worksheet.getRow(1).eachCell((cell) => {
        headers.push(String(cell.value ?? "").trim());
    });

    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const record: Record<string, unknown> = {};

        headers.forEach((header, index) => {
            record[header] = row.getCell(index + 1).value;
        });

        records.push(record);
    });

    return records;
};

export const parseUploadedFile = async (
    buffer: Buffer,
    mimetype: string
) => {
    if (mimetype === "text/csv") {
        return parseCsvFile(buffer);
    }

    if (
        mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        mimetype === "application/vnd.ms-excel"
    ) {
        return parseExcelFile(buffer);
    }

    throw new Error("Unsupported file type");
};