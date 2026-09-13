import mongoose from "mongoose";
import { z } from "zod";

const transactionDateSchema = z.union(
    [
        z.date(),
        z.string()
            .trim()
            .pipe(
                z.union([
                    z.iso.date(),
                    z.iso.datetime({ offset: true }),
                ])
            )
            .pipe(z.coerce.date()),
    ],
    {
        error:
            "Use a valid Excel date, YYYY-MM-DD, or an ISO timestamp with a timezone",
    }
);

const amountSchema = z.string().trim().refine(
    (value) => {
        try {
            const decimal = mongoose.Types.Decimal128
                .fromString(value)
                .toString();

            const coefficient = decimal.split(/[eE]/)[0] ?? "";

            return (
                !decimal.startsWith("-") &&
                decimal !== "NaN" &&
                decimal !== "Infinity" &&
                /[1-9]/.test(coefficient)
            );
        } catch {
            return false;
        }
    },
    {
        message:
            "Amount must be a positive, finite decimal within Decimal128 limits",
    }
);

export const transactionRowSchema = z.object({
    transactionId: z.string().trim().min(
        1,
        "Transaction ID is required"
    ),

    referenceNumber: z.string().trim().optional(),

    accountNumber: z.string().trim().optional(),

    amount: amountSchema,

    transactionDate: transactionDateSchema,

    status: z.enum([
        "SUCCESS",
        "FAILED",
        "PENDING",
        "REVERSED",
    ]),
});