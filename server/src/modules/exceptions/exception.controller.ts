import type { Request, Response } from "express";

import { Exception } from "./exception.model.js";

export const getExceptions = async (
    _req: Request,
    res: Response
) => {
    try {
        const exceptions = await Exception.find()
            .select("-__v")
            .populate("transactionId")
            .populate("reconciliationResultId")
            .sort({ score: -1, createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: exceptions,
        });
    } catch (error) {
        console.error("Get exceptions error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve exceptions",
        });
    }
};