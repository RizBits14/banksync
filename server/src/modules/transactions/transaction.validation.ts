import { z } from "zod";

export const transactionRowSchema = z.object({
    transactionId: z.string().trim().min(1, "Transaction ID is required"),

    referenceNumber: z.string().trim().optional(),

    accountNumber: z.string().trim().optional(),

    amount: z.coerce
        .number()
        .positive("Amount must be greater than 0"),

    transactionDate: z.coerce.date(),

    status: z.enum([
        "SUCCESS",
        "FAILED",
        "PENDING",
        "REVERSED",
    ]),
});