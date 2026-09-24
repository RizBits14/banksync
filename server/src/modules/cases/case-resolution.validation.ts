import { z } from "zod";

export const resolveCaseSchema = z.object({
    resolutionExecutionNote: z
        .string()
        .trim()
        .min(
            3,
            "Resolution execution note is required"
        )
        .max(
            2000,
            "Resolution execution note cannot exceed 2000 characters"
        ),
});

export const closeCaseSchema = z.object({
    closureNote: z
        .string()
        .trim()
        .min(
            3,
            "Closure note is required"
        )
        .max(
            2000,
            "Closure note cannot exceed 2000 characters"
        ),
});