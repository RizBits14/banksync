import { Router } from "express";

import {
    createReconciliation,
    getReconciliationResults,
    getReconciliations,
} from "./reconciliation.controller.js";
import { retryReconciliation } from "./reconciliation.retry.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/authorizeRoles.js";

const reconciliationRouter = Router();

reconciliationRouter.post(
    "/",
    authenticate,
    authorizeRoles("ADMIN", "IMPORT_OFFICER"),
    createReconciliation
);

reconciliationRouter.post(
    "/:id/retry",
    authenticate,
    authorizeRoles("ADMIN", "IMPORT_OFFICER"),
    retryReconciliation
);

reconciliationRouter.get(
    "/",
    authenticate,
    getReconciliations
);

reconciliationRouter.get(
    "/:id/results",
    authenticate,
    getReconciliationResults
);

export default reconciliationRouter;
