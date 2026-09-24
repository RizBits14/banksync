import {
    Router,
} from "express";

import {
    exportCasesReport,
    exportDataCorrectionsReport,
    exportDataQualityReport,
    exportExceptionsReport,
    exportReconciliationReport,
    getReportsSummary,
} from "./report.controller.js";

import {
    authenticate,
} from "../../middleware/auth.middleware.js";

import {
    authorizeRoles,
} from "../../middleware/authorizeRoles.js";

const reportRouter =
    Router();

const REPORT_ROLES = [
    "ADMIN",
    "AUDITOR",
    "OPERATIONS_MANAGER",
] as const;

/*
 * ----------------------------------------
 * REPORTS DASHBOARD SUMMARY
 * ----------------------------------------
 */
reportRouter.get(
    "/summary",
    authenticate,
    authorizeRoles(
        ...REPORT_ROLES
    ),
    getReportsSummary
);

/*
 * ----------------------------------------
 * EXPORTS
 * ----------------------------------------
 */
reportRouter.get(
    "/reconciliations/:id",
    authenticate,
    authorizeRoles(
        ...REPORT_ROLES
    ),
    exportReconciliationReport
);

reportRouter.get(
    "/exceptions",
    authenticate,
    authorizeRoles(
        ...REPORT_ROLES
    ),
    exportExceptionsReport
);

reportRouter.get(
    "/cases",
    authenticate,
    authorizeRoles(
        ...REPORT_ROLES
    ),
    exportCasesReport
);

reportRouter.get(
    "/data-quality",
    authenticate,
    authorizeRoles(
        ...REPORT_ROLES
    ),
    exportDataQualityReport
);

reportRouter.get(
    "/data-corrections",
    authenticate,
    authorizeRoles(
        ...REPORT_ROLES
    ),
    exportDataCorrectionsReport
);

export default reportRouter;
