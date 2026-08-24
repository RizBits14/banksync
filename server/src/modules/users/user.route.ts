import { Router } from "express";

import {
    getUsers,
    updateUserStatus,
} from "./user.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/authorizeRoles.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { updateUserStatusSchema } from "./user.validation.js";

const userRouter = Router();

userRouter.get(
    "/",
    authenticate,
    authorizeRoles("ADMIN"),
    getUsers
);

userRouter.patch(
    "/:id/status",
    authenticate,
    authorizeRoles("ADMIN"),
    validateRequest(updateUserStatusSchema),
    updateUserStatus
);

export default userRouter;