import { z } from "zod";

const columnMappingSchema = z.object({
    transactionId: z.string().min(1),
    referenceNumber: z.string().optional(),
    accountNumber: z.string().optional(),
    amount: z.string().min(1),
    transactionDate: z.string().min(1),
    status: z.string().min(1),
});

export const uploadSchema = z.object({
    sourceSystem: z.enum([
        "CBS",
        "ATM",
        "INTERNET_BANKING",
        "MOBILE_BANKING",
        "PAYMENT_GATEWAY",
        "GENERAL_LEDGER",
        "REMITTANCE",
    ]),

    mapping: z.string().transform((value, ctx) => {
        try {
            const parsed = JSON.parse(value);

            const result = columnMappingSchema.safeParse(parsed);

            if (!result.success) {
                ctx.addIssue({
                    code: "custom",
                    message: "Invalid column mapping",
                });

                return z.NEVER;
            }

            return result.data;
        } catch {
            ctx.addIssue({
                code: "custom",
                message: "Mapping must be valid JSON",
            });

            return z.NEVER;
        }
    }),
});