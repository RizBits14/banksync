import { Router } from "express";

import {
    assignCase,
    getCaseById,
    getCases,
    startInvestigation,
    submitCase,
    updateInvestigation,
} from "./case.controller.js";

import {
    approveCase,
    returnCaseToMaker,
} from "./checker.controller.js";

import {
    resolveCase,
    closeCase,
} from "./case-resolution.controller.js";

import {
    getCaseDataset,
} from "./case-dataset.controller.js";

import {
    approveCaseSchema,
    returnCaseSchema,
} from "./checker.validation.js";

import {
    resolveCaseSchema,
    closeCaseSchema,
} from "./case-resolution.validation.js";

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
    requireCompletedCaseReconciliation,
} from "./case-readiness.middleware.js";

import {
    assignCaseSchema,
    updateInvestigationSchema,
} from "./case.validation.js";

const caseRouter = Router();

/*
 * ----------------------------------------
 * CASE LIST
 * ----------------------------------------
 */
caseRouter.get(
    "/",
    authenticate,
    authorizeRoles(
        "ADMIN",
        "MAKER",
        "CHECKER",
        "AUDITOR",
        "OPERATIONS_MANAGER"
    ),
    getCases
);

/*
 * ----------------------------------------
 * CASE DATASET INSPECTION
 * ----------------------------------------
 */
caseRouter.get(
    "/:id/dataset/:side",
    authenticate,
    authorizeRoles(
        "ADMIN",
        "MAKER",
        "CHECKER",
        "AUDITOR",
        "OPERATIONS_MANAGER"
    ),
    getCaseDataset
);

/*
 * ----------------------------------------
 * CASE DETAILS
 * ----------------------------------------
 */
caseRouter.get(
    "/:id",
    authenticate,
    authorizeRoles(
        "ADMIN",
        "MAKER",
        "CHECKER",
        "AUDITOR",
        "OPERATIONS_MANAGER"
    ),
    getCaseById
);

/*
 * ----------------------------------------
 * ASSIGN CASE
 * ----------------------------------------
 */
caseRouter.patch(
    "/:id/assign",
    authenticate,
    authorizeRoles(
        "ADMIN",
        "OPERATIONS_MANAGER"
    ),
    validateRequest(
        assignCaseSchema
    ),
    requireCompletedCaseReconciliation,
    assignCase
);

/*
 * ----------------------------------------
 * START / REOPEN INVESTIGATION
 * ----------------------------------------
 */
caseRouter.patch(
    "/:id/start",
    authenticate,
    authorizeRoles(
        "MAKER"
    ),
    requireCompletedCaseReconciliation,
    startInvestigation
);

/*
 * ----------------------------------------
 * UPDATE INVESTIGATION
 * ----------------------------------------
 */
caseRouter.patch(
    "/:id/investigation",
    authenticate,
    authorizeRoles(
        "MAKER"
    ),
    validateRequest(
        updateInvestigationSchema
    ),
    requireCompletedCaseReconciliation,
    updateInvestigation
);

/*
 * ----------------------------------------
 * SUBMIT TO CHECKER
 * ----------------------------------------
 */
caseRouter.post(
    "/:id/submit",
    authenticate,
    authorizeRoles(
        "MAKER"
    ),
    requireCompletedCaseReconciliation,
    submitCase
);

/*
 * ----------------------------------------
 * CHECKER APPROVAL
 * ----------------------------------------
 */
caseRouter.post(
    "/:id/approve",
    authenticate,
    authorizeRoles(
        "CHECKER"
    ),
    validateRequest(
        approveCaseSchema
    ),
    requireCompletedCaseReconciliation,
    approveCase
);

/*
 * ----------------------------------------
 * CHECKER RETURN
 * ----------------------------------------
 */
caseRouter.post(
    "/:id/return",
    authenticate,
    authorizeRoles(
        "CHECKER"
    ),
    validateRequest(
        returnCaseSchema
    ),
    requireCompletedCaseReconciliation,
    returnCaseToMaker
);

/*
 * ----------------------------------------
 * RESOLVE APPROVED CASE
 * ----------------------------------------
 *
 * APPROVED -> RESOLVED
 *
 * Admin / Operations Manager confirms
 * that the approved corrective action
 * was actually completed.
 */
caseRouter.post(
    "/:id/resolve",
    authenticate,
    authorizeRoles(
        "ADMIN",
        "OPERATIONS_MANAGER"
    ),
    validateRequest(
        resolveCaseSchema
    ),
    requireCompletedCaseReconciliation,
    resolveCase
);

/*
 * ----------------------------------------
 * CLOSE RESOLVED CASE
 * ----------------------------------------
 *
 * RESOLVED -> CLOSED
 */
caseRouter.post(
    "/:id/close",
    authenticate,
    authorizeRoles(
        "ADMIN",
        "OPERATIONS_MANAGER"
    ),
    validateRequest(
        closeCaseSchema
    ),
    requireCompletedCaseReconciliation,
    closeCase
);

export default caseRouter;