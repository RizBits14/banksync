import { Router } from "express";

import { createReconciliation } from "./reconciliation.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/authorizeRoles.js";

const reconciliationRouter = Router();

reconciliationRouter.post(
    "/",
    authenticate,
    authorizeRoles("ADMIN", "IMPORT_OFFICER"),
    createReconciliation
);

export default reconciliationRouter;