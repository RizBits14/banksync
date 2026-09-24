import { z } from "zod";

export const createAccountRequestSchema =
    z.object({
        name: z
            .string()
            .trim()
            .min(
                2,
                "Full name must be at least 2 characters"
            ),

        email: z
            .email(
                "Please enter a valid email address"
            )
            .transform((value) =>
                value
                    .trim()
                    .toLowerCase()
            ),
    });

export const rejectAccountRequestSchema =
    z.object({
        rejectionReason: z
            .string()
            .trim()
            .min(
                3,
                "Rejection reason must be at least 3 characters"
            )
            .max(
                500,
                "Rejection reason cannot exceed 500 characters"
            ),
    });

export const approveAccountRequestSchema =
    z.object({
        role: z.enum([
            "ADMIN",
            "IMPORT_OFFICER",
            "MAKER",
            "CHECKER",
            "AUDITOR",
            "OPERATIONS_MANAGER",
        ]),
    });