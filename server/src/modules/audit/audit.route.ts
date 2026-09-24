import { Router } from "express";

import {
    getAuditLogs,
    getCaseAuditHistory,
} from "./audit.controller.js";

import {
    authenticate,
} from "../../middleware/auth.middleware.js";

import {
    authorizeRoles,
} from "../../middleware/authorizeRoles.js";

const auditRouter = Router();

/*
 * ----------------------------------------
 * CASE-SPECIFIC BUSINESS HISTORY
 * ----------------------------------------
 *
 * Used inside Case Details.
 *
 * Maker access is further restricted
 * inside the controller to cases that
 * are actually assigned to that Maker.
 */
auditRouter.get(
    "/case/:caseId",
    authenticate,
    authorizeRoles(
        "ADMIN",
        "MAKER",
        "CHECKER",
        "AUDITOR",
        "OPERATIONS_MANAGER"
    ),
    getCaseAuditHistory
);

/*
 * ----------------------------------------
 * GLOBAL AUDIT LOGS
 * ----------------------------------------
 *
 * Administrative / audit view containing
 * both technical HTTP logs and business
 * workflow events.
 */
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