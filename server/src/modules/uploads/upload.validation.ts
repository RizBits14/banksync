import { z } from "zod";

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
});