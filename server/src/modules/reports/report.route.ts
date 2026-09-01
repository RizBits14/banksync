import { Router } from "express";

import {
    exportCasesReport,
    exportExceptionsReport,
    exportReconciliationReport,
} from "./report.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/authorizeRoles.js";

const reportRouter = Router();

reportRouter.get(
    "/reconciliations/:id",
    authenticate,
    authorizeRoles(
        "ADMIN",
        "AUDITOR",
        "OPERATIONS_MANAGER"
    ),
    exportReconciliationReport
);

reportRouter.get(
    "/exceptions",
    authenticate,
    authorizeRoles(
        "ADMIN",
        "AUDITOR",
        "OPERATIONS_MANAGER"
    ),
    exportExceptionsReport
);

reportRouter.get(
    "/cases",
    authenticate,
    authorizeRoles(
        "ADMIN",
        "AUDITOR",
        "OPERATIONS_MANAGER"
    ),
    exportCasesReport
);

export default reportRouter;