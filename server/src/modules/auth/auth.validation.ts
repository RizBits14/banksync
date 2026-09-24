import { z } from "zod";

export const registerSchema = z.object({
    name: z
        .string()
        .trim()
        .min(
            2,
            "Name must be at least 2 characters"
        ),

    email: z.email(
        "Invalid email address"
    ),

    password: z
        .string()
        .length(
            6,
            "Temporary password must be exactly 6 characters"
        ),

    role: z.enum([
        "ADMIN",
        "IMPORT_OFFICER",
        "MAKER",
        "CHECKER",
        "AUDITOR",
        "OPERATIONS_MANAGER",
    ]),
});

export const loginSchema = z.object({
    email: z.email(
        "Invalid email address"
    ),

    password: z
        .string()
        .min(
            1,
            "Password is required"
        ),
});

export const changePasswordSchema =
    z
        .object({
            currentPassword: z
                .string()
                .min(
                    1,
                    "Current password is required"
                ),

            newPassword: z
                .string()
                .min(
                    8,
                    "New password must be at least 8 characters"
                )
                .regex(
                    /[A-Z]/,
                    "New password must contain at least one uppercase letter"
                )
                .regex(
                    /[a-z]/,
                    "New password must contain at least one lowercase letter"
                )
                .regex(
                    /[0-9]/,
                    "New password must contain at least one number"
                ),

            confirmPassword: z
                .string()
                .min(
                    1,
                    "Please confirm the new password"
                ),
        })
        .refine(
            (data) =>
                data.newPassword ===
                data.confirmPassword,
            {
                message:
                    "New password and confirmation do not match",

                path: [
                    "confirmPassword",
                ],
            }
        );