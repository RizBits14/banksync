import { Router } from "express";

import { getAuditLogs } from "./audit.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/authorizeRoles.js";

const auditRouter = Router();

auditRouter.get(
    "/",
    authenticate,
    authorizeRoles(
        "ADMIN",
        "AUDITOR",
        "OPERATIONS_MANAGER"
    ),
    getAuditLogs
);

export default auditRouter;