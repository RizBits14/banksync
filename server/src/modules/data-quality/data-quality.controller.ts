import mongoose from "mongoose";

import type {
    Request,
    Response,
} from "express";

import { DataQualityIssue } from "./data-quality.model.js";

import {
    scanUploadDataQuality,
} from "./data-quality.service.js";

export const scanUpload =
    async (
        req: Request,
        res: Response
    ) => {
        try {
            const uploadIdParam =
                req.params.uploadId;

            const uploadId =
                Array.isArray(uploadIdParam)
                    ? uploadIdParam[0]
                    : uploadIdParam;

            if (!uploadId) {
                return res.status(400).json({
                    success: false,
                    message: "Upload ID is required",
                });
            }

            if (
                !mongoose.isValidObjectId(
                    uploadId
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid upload ID",
                });
            }

            const result =
                await scanUploadDataQuality(
                    uploadId
                );

            return res.status(200).json({
                success: true,
                message:
                    "Data quality scan completed",
                data: result,
            });
        } catch (error) {
            console.error(
                "Data quality scan error:",
                error
            );

            const message =
                error instanceof Error
                    ? error.message
                    : "Unable to scan upload";

            if (
                message ===
                "Upload not found"
            ) {
                return res.status(404).json({
                    success: false,
                    message,
                });
            }

            return res.status(500).json({
                success: false,
                message:
                    "Unable to scan upload",
            });
        }
    };

export const getDataQualityIssues =
    async (
        req: Request,
        res: Response
    ) => {
        try {
            const filter: Record<
                string,
                unknown
            > = {};

            if (req.query.uploadId) {
                const uploadId =
                    String(
                        req.query.uploadId
                    );

                if (
                    !mongoose.isValidObjectId(
                        uploadId
                    )
                ) {
                    return res
                        .status(400)
                        .json({
                            success: false,
                            message:
                                "Invalid upload ID",
                        });
                }

                filter.uploadId =
                    uploadId;
            }

            if (req.query.issueType) {
                filter.issueType =
                    String(
                        req.query.issueType
                    );
            }

            if (req.query.status) {
                filter.status =
                    String(
                        req.query.status
                    );
            }

            if (req.query.severity) {
                filter.severity =
                    String(
                        req.query.severity
                    );
            }

            const issues =
                await DataQualityIssue.find(
                    filter
                )
                    .populate(
                        "uploadId",
                        "originalFilename sourceSystem status"
                    )
                    .populate(
                        "primaryTransactionId"
                    )
                    .populate(
                        "relatedTransactionIds"
                    )
                    .sort({
                        createdAt: -1,
                    });

            return res.status(200).json({
                success: true,
                data: issues,
            });
        } catch (error) {
            console.error(
                "Get data quality issues error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to retrieve data quality issues",
            });
        }
    };

export const getDataQualitySummary =
    async (
        _req: Request,
        res: Response
    ) => {
        try {
            const [
                totalIssues,
                openIssues,
                byType,
                bySeverity,
            ] = await Promise.all([
                DataQualityIssue.countDocuments(),

                DataQualityIssue.countDocuments({
                    status: "OPEN",
                }),

                DataQualityIssue.aggregate([
                    {
                        $group: {
                            _id: "$issueType",
                            count: {
                                $sum: 1,
                            },
                        },
                    },
                    {
                        $sort: {
                            count: -1,
                        },
                    },
                ]),

                DataQualityIssue.aggregate([
                    {
                        $group: {
                            _id: "$severity",
                            count: {
                                $sum: 1,
                            },
                        },
                    },
                    {
                        $sort: {
                            count: -1,
                        },
                    },
                ]),
            ]);

            return res.status(200).json({
                success: true,

                data: {
                    totalIssues,
                    openIssues,
                    byType,
                    bySeverity,
                },
            });
        } catch (error) {
            console.error(
                "Data quality summary error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to retrieve data quality summary",
            });
        }
    };