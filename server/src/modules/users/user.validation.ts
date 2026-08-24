import { z } from "zod";

export const updateUserStatusSchema = z.object({
    isActive: z.boolean(),
});

export const updateUserRoleSchema = z.object({
    role: z.enum([
        "ADMIN",
        "IMPORT_OFFICER",
        "MAKER",
        "CHECKER",
        "AUDITOR",
        "OPERATIONS_MANAGER",
    ]),
});