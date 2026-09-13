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
    approveCaseSchema,
    returnCaseSchema,
} from "./checker.validation.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/authorizeRoles.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { requireCompletedCaseReconciliation } from "./case-readiness.middleware.js";

import {
    assignCaseSchema,
    updateInvestigationSchema,
} from "./case.validation.js";

const caseRouter = Router();

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

caseRouter.patch(
    "/:id/assign",
    authenticate,
    authorizeRoles(
        "ADMIN",
        "OPERATIONS_MANAGER"
    ),
    validateRequest(assignCaseSchema),
    requireCompletedCaseReconciliation,
    assignCase
);

caseRouter.patch(
    "/:id/start",
    authenticate,
    authorizeRoles("MAKER"),
    requireCompletedCaseReconciliation,
    startInvestigation
);

caseRouter.patch(
    "/:id/investigation",
    authenticate,
    authorizeRoles("MAKER"),
    validateRequest(
        updateInvestigationSchema
    ),
    requireCompletedCaseReconciliation,
    updateInvestigation
);

caseRouter.post(
    "/:id/submit",
    authenticate,
    authorizeRoles("MAKER"),
    requireCompletedCaseReconciliation,
    submitCase
);

caseRouter.post(
    "/:id/approve",
    authenticate,
    authorizeRoles("CHECKER"),
    validateRequest(approveCaseSchema),
    requireCompletedCaseReconciliation,
    approveCase
);

caseRouter.post(
    "/:id/return",
    authenticate,
    authorizeRoles("CHECKER"),
    validateRequest(returnCaseSchema),
    requireCompletedCaseReconciliation,
    returnCaseToMaker
);

export default caseRouter;
