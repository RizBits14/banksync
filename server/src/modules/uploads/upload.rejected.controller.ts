import mongoose from "mongoose";
import type {
    Request,
    Response,
} from "express";

import { Upload } from "./upload.model.js";
import { UploadRejectedRow } from "./upload.rejection.model.js";

interface ValidationIssue {
    field: string;
    message: string;
}

interface LegacyRejectedRow {
    errors?: ValidationIssue[];
}

const escapeCsvValue = (
    value: unknown
) => {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    const text =
        typeof value === "object"
            ? JSON.stringify(value)
            : String(value);

    const escaped = text.replace(
        /"/g,
        '""'
    );

    return `"${escaped}"`;
};

export const downloadRejectedRows = async (
    req: Request,
    res: Response
) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid upload ID",
            });
        }

        const upload = await Upload.findById(
            id
        ).select(
            "originalName invalidRows status"
        );

        if (!upload) {
            return res.status(404).json({
                success: false,
                message: "Upload not found",
            });
        }

        if (
            !upload.invalidRows ||
            upload.invalidRows === 0
        ) {
            return res.status(404).json({
                success: false,
                message:
                    "This upload has no rejected rows",
            });
        }

        const rejectedRows =
            await UploadRejectedRow.find({
                uploadId: upload._id,
            })
                .sort({
                    recordNumber: 1,
                })
                .lean();

        if (rejectedRows.length === 0) {
            return res.status(404).json({
                success: false,
                message:
                    "Rejected row data is not available for this upload",
            });
        }

        const originalColumns =
            Array.from(
                new Set(
                    rejectedRows.flatMap(
                        (row) =>
                            Object.keys(
                                row.rawRecord ?? {}
                            )
                    )
                )
            );

        const csvHeaders = [
            "RecordNumber",
            ...originalColumns,
            "ValidationErrors",
        ];

        const csvRows =
            rejectedRows.map((row) => {
                const legacyRow =
                    row as typeof row &
                        LegacyRejectedRow;

                const issues =
                    row.validationIssues?.length
                        ? row.validationIssues
                        : legacyRow.errors ?? [];

                const validationErrors =
                    issues
                        .map(
                            (issue) =>
                                `${issue.field}: ${issue.message}`
                        )
                        .join(" | ");

                const values = [
                    row.recordNumber,

                    ...originalColumns.map(
                        (column) =>
                            row.rawRecord?.[
                                column
                            ]
                    ),

                    validationErrors,
                ];

                return values
                    .map(escapeCsvValue)
                    .join(",");
            });

        const csvContent = [
            csvHeaders
                .map(escapeCsvValue)
                .join(","),

            ...csvRows,
        ].join("\n");

        const baseFileName =
            upload.originalName
                .replace(/\.[^.]+$/, "")
                .replace(
                    /[^a-zA-Z0-9_-]/g,
                    "_"
                );

        const downloadFileName =
            `${baseFileName}_rejected_rows.csv`;

        res.setHeader(
            "Content-Type",
            "text/csv; charset=utf-8"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${downloadFileName}"`
        );

        return res
            .status(200)
            .send(`\uFEFF${csvContent}`);
    } catch (error) {
        console.error(
            "Download rejected rows error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to download rejected rows",
        });
    }
};