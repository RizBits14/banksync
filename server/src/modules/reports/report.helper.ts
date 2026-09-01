import type { Response } from "express";
import ExcelJS from "exceljs";

export type ReportRow =
    Record<
        string,
        string | number | boolean | null
    >;

const escapeCsvValue = (
    value:
        | string
        | number
        | boolean
        | null
) => {
    if (value === null) {
        return "";
    }

    const stringValue =
        String(value);

    if (
        stringValue.includes(",") ||
        stringValue.includes('"') ||
        stringValue.includes("\n")
    ) {
        return `"${stringValue.replace(
            /"/g,
            '""'
        )}"`;
    }

    return stringValue;
};

export const sendCsv = (
    res: Response,
    filename: string,
    rows: ReportRow[]
) => {
    if (rows.length === 0) {
        return res.status(404).json({
            success: false,
            message:
                "No report data found",
        });
    }

    const headers =
        Object.keys(rows[0]);

    const csvRows = [
        headers.join(","),

        ...rows.map((row) =>
            headers
                .map((header) =>
                    escapeCsvValue(
                        row[header]
                    )
                )
                .join(",")
        ),
    ];

    const csv =
        "\uFEFF" +
        csvRows.join("\n");

    res.setHeader(
        "Content-Type",
        "text/csv; charset=utf-8"
    );

    res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}.csv"`
    );

    return res.send(csv);
};

export const sendXlsx = async (
    res: Response,
    filename: string,
    sheetName: string,
    rows: ReportRow[]
) => {
    if (rows.length === 0) {
        return res.status(404).json({
            success: false,
            message:
                "No report data found",
        });
    }

    const workbook =
        new ExcelJS.Workbook();

    const worksheet =
        workbook.addWorksheet(
            sheetName.slice(0, 31)
        );

    const headers =
        Object.keys(rows[0]);

    worksheet.columns =
        headers.map((header) => ({
            header,
            key: header,
            width: 22,
        }));

    worksheet.addRows(rows);

    worksheet.getRow(1).font = {
        bold: true,
    };

    const buffer =
        await workbook.xlsx.writeBuffer();

    res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}.xlsx"`
    );

    return res.send(
        Buffer.from(buffer)
    );
};