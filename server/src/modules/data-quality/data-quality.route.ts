import {
    Router,
} from "express";

import {
    createDataQualityInvestigation,
    getDataQualityIssues,
    getDataQualitySummary,
    scanUpload,
} from "./data-quality.controller.js";

import {
    authenticate,
} from "../../middleware/auth.middleware.js";

import {
    authorizeRoles,
} from "../../middleware/authorizeRoles.js";

import {
    validateRequest,
} from "../../middleware/validateRequest.js";

import {
    createDataQualityInvestigationSchema,
} from "../cases/case.validation.js";

const dataQualityRouter =
    Router();

/*
 * ----------------------------------------
 * RUN DATA QUALITY SCAN
 * ----------------------------------------
 *
 * Import responsibility:
 *
 * ADMIN
 * IMPORT_OFFICER
 */
dataQualityRouter.post(
    "/scan/:uploadId",
    authenticate,
    authorizeRoles(
        "ADMIN",
        "IMPORT_OFFICER"
    ),
    scanUpload
);

/*
 * ----------------------------------------
 * CREATE INVESTIGATION CASE
 * ----------------------------------------
 *
 * Workflow:
 *
 * Data Quality Issue
 *        ↓
 * Admin / Operations Manager
 * selects Maker + Priority
 *        ↓
 * Case created and assigned
 *        ↓
 * Issue becomes UNDER_REVIEW
 *
 * This replaces the old manual
 * "Resolve Issue" behavior.
 */
dataQualityRouter.post(
    "/issues/:id/investigation",
    authenticate,
    authorizeRoles(
        "ADMIN",
        "OPERATIONS_MANAGER"
    ),
    validateRequest(
        createDataQualityInvestigationSchema
    ),
    createDataQualityInvestigation
);

/*
 * ----------------------------------------
 * VIEW DATA QUALITY ISSUES
 * ----------------------------------------
 */
dataQualityRouter.get(
    "/issues",
    authenticate,
    authorizeRoles(
        "ADMIN",
        "IMPORT_OFFICER",
        "CHECKER",
        "AUDITOR",
        "OPERATIONS_MANAGER"
    ),
    getDataQualityIssues
);

/*
 * ----------------------------------------
 * DATA QUALITY SUMMARY
 * ----------------------------------------
 */
dataQualityRouter.get(
    "/summary",
    authenticate,
    authorizeRoles(
        "ADMIN",
        "CHECKER",
        "AUDITOR",
        "OPERATIONS_MANAGER"
    ),
    getDataQualitySummary
);

export default dataQualityRouter;