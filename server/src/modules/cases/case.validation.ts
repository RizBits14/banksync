import { z } from "zod";

export const assignCaseSchema = z.object({
    makerId: z
        .string()
        .min(1, "Maker ID is required"),
});

export const updateInvestigationSchema = z
    .object({
        investigationNotes: z
            .string()
            .trim()
            .max(5000)
            .optional(),

        proposedResolution: z
            .string()
            .trim()
            .max(3000)
            .optional(),
    })
    .refine(
        (data) =>
            data.investigationNotes !== undefined ||
            data.proposedResolution !== undefined,
        {
            message:
                "At least one investigation field is required",
        }
    );