import { Router } from "express";

import {
    getUserById,
    getUsers,
    updateUserRole,
    updateUserStatus,
} from "./user.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/authorizeRoles.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import {
    updateUserRoleSchema,
    updateUserStatusSchema,
} from "./user.validation.js";

const userRouter = Router();

userRouter.get(
    "/",
    authenticate,
    authorizeRoles("ADMIN"),
    getUsers
);

userRouter.get(
    "/:id",
    authenticate,
    authorizeRoles("ADMIN"),
    getUserById
);

userRouter.patch(
    "/:id/role",
    authenticate,
    authorizeRoles("ADMIN"),
    validateRequest(updateUserRoleSchema),
    updateUserRole
);

userRouter.patch(
    "/:id/status",
    authenticate,
    authorizeRoles("ADMIN"),
    validateRequest(updateUserStatusSchema),
    updateUserStatus
);

export default userRouter;