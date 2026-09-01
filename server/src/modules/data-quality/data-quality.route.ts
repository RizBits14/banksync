import { Router } from "express";

import {
    getDataQualityIssues,
    getDataQualitySummary,
    scanUpload,
} from "./data-quality.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";

import { authorizeRoles } from "../../middleware/authorizeRoles.js";

const dataQualityRouter =
    Router();

dataQualityRouter.post(
    "/scan/:uploadId",
    authenticate,
    authorizeRoles(
        "ADMIN",
        "IMPORT_OFFICER"
    ),
    scanUpload
);

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