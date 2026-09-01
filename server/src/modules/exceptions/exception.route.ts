import { Router } from "express";

import { getExceptions } from "./exception.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/authorizeRoles.js";

const exceptionRouter = Router();

exceptionRouter.get(
    "/",
    authenticate,
    authorizeRoles(
        "ADMIN",
        "MAKER",
        "CHECKER",
        "AUDITOR",
        "OPERATIONS_MANAGER"
    ),
    getExceptions
);

export default exceptionRouter;