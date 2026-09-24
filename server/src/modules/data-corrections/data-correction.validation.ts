import { z } from "zod";

export const requestDataCorrectionSchema =
    z.object({
        importOfficerId: z
            .string()
            .trim()
            .min(
                1,
                "Import Officer is required"
            ),

        checkerInstruction: z
            .string()
            .trim()
            .min(
                10,
                "Correction instruction must be at least 10 characters"
            )
            .max(
                5000,
                "Correction instruction cannot exceed 5000 characters"
            ),
    });
