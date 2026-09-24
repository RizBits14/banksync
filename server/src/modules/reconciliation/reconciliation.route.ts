import { Router } from "express";

import {
    createReconciliation,
    getReconciliationProfiles,
    getReconciliationResults,
    getReconciliations,
} from "./reconciliation.controller.js";

import {
    retryReconciliation,
} from "./reconciliation.retry.controller.js";

import {
    authenticate,
} from "../../middleware/auth.middleware.js";

import {
    authorizeRoles,
} from "../../middleware/authorizeRoles.js";

const reconciliationRouter =
    Router();

/*
 * ----------------------------------------
 * RECONCILIATION PROFILES
 * ----------------------------------------
 *
 * IMPORTANT:
 * This route must be declared BEFORE any
 * dynamic "/:id/..." routes.
 *
 * Otherwise Express could treat "profiles"
 * as an ID value.
 *
 * All authenticated users who can access
 * the Reconciliation page may read the
 * approved pairing profiles.
 */
reconciliationRouter.get(
    "/profiles",
    authenticate,
    getReconciliationProfiles
);

/*
 * Create a reconciliation.
 *
 * Only Admin and Import Officer may start
 * a new reconciliation.
 */
reconciliationRouter.post(
    "/",
    authenticate,
    authorizeRoles(
        "ADMIN",
        "IMPORT_OFFICER"
    ),
    createReconciliation
);

/*
 * Retry a failed reconciliation.
 */
reconciliationRouter.post(
    "/:id/retry",
    authenticate,
    authorizeRoles(
        "ADMIN",
        "IMPORT_OFFICER"
    ),
    retryReconciliation
);

/*
 * View reconciliation history.
 *
 * Available to authenticated roles that
 * can access the Reconciliation module.
 */
reconciliationRouter.get(
    "/",
    authenticate,
    getReconciliations
);

/*
 * View results for one completed
 * reconciliation.
 */
reconciliationRouter.get(
    "/:id/results",
    authenticate,
    getReconciliationResults
);

export default reconciliationRouter;
