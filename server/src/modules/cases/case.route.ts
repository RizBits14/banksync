import { Router } from "express";

import {
    assignCase,
    getCaseById,
    getCases,
    startInvestigation,
    submitCase,
    updateInvestigation,
} from "./case.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/authorizeRoles.js";
import { validateRequest } from "../../middleware/validateRequest.js";

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
    assignCase
);

caseRouter.patch(
    "/:id/start",
    authenticate,
    authorizeRoles("MAKER"),
    startInvestigation
);

caseRouter.patch(
    "/:id/investigation",
    authenticate,
    authorizeRoles("MAKER"),
    validateRequest(
        updateInvestigationSchema
    ),
    updateInvestigation
);

caseRouter.post(
    "/:id/submit",
    authenticate,
    authorizeRoles("MAKER"),
    submitCase
);

export default caseRouter;