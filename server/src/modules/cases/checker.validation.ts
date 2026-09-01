import { z } from "zod";

export const approveCaseSchema = z.object({
    checkerComment: z
        .string()
        .trim()
        .max(1000)
        .optional(),
});

export const returnCaseSchema = z.object({
    checkerComment: z
        .string()
        .trim()
        .min(
            3,
            "Checker comment is required when returning a case"
        )
        .max(1000),
});