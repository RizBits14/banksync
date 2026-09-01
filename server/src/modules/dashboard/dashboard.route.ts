import { Router } from "express";

import { getDashboardSummary } from "./dashboard.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/authorizeRoles.js";

const dashboardRouter = Router();

dashboardRouter.get(
    "/summary",
    authenticate,
    authorizeRoles(
        "ADMIN",
        "CHECKER",
        "AUDITOR",
        "OPERATIONS_MANAGER"
    ),
    getDashboardSummary
);

export default dashboardRouter;