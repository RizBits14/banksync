import type { Request, Response } from "express";

import { Transaction } from "./transaction.model.js";

export const getTransactions = async (
    _req: Request,
    res: Response
) => {
    try {
        const transactions = await Transaction.find()
            .select("-__v")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: transactions,
        });
    } catch (error) {
        console.error("Get transactions error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve transactions",
        });
    }
};