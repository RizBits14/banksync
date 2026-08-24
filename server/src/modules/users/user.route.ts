import { Router } from "express";

import {
    getUsers,
    updateUserStatus,
} from "./user.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/authorizeRoles.js";

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
    updateUserStatus
);

export default userRouter;