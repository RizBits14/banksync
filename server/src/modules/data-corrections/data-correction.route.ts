import {
    Router,
} from "express";

import {
    getActiveImportOfficers,
    getDataCorrectionTaskByCase,
    getMyDataCorrectionTasks,
    rejectCorrectionVerification,
    requestDataCorrection,
    startDataCorrectionTask,
} from "./data-correction.controller.js";

import {
    requestDataCorrectionSchema,
} from "./data-correction.validation.js";

import {
    submitCorrectedUpload,
} from "./data-correction-upload.controller.js";

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
    uploadFile,
} from "../uploads/upload.middleware.js";

const dataCorrectionRouter =
    Router();

/*
 * ----------------------------------------
 * CHECKER / OPERATIONS LOOKUP
 * ----------------------------------------
 *
 * Small role-scoped lookup for assigning
 * a correction task to an active
 * Import Officer.
 */
dataCorrectionRouter.get(
    "/import-officers",
    authenticate,
    authorizeRoles(
        "CHECKER",
        "ADMIN",
        "OPERATIONS_MANAGER"
    ),
    getActiveImportOfficers
);

/*
 * ----------------------------------------
 * ADMIN / OPERATIONS - REJECT CORRECTION
 * ----------------------------------------
 *
 * Final operational review can invalidate a
 * scanner-level verification result and send
 * the task back to the Import Officer.
 */
dataCorrectionRouter.post(
    "/:taskId/reject-verification",
    authenticate,
    authorizeRoles(
        "ADMIN",
        "OPERATIONS_MANAGER"
    ),
    rejectCorrectionVerification
);

/*
 * ----------------------------------------
 * IMPORT OFFICER - MY TASK QUEUE
 * ----------------------------------------
 */
dataCorrectionRouter.get(
    "/mine",
    authenticate,
    authorizeRoles(
        "IMPORT_OFFICER"
    ),
    getMyDataCorrectionTasks
);

/*
 * ----------------------------------------
 * IMPORT OFFICER - START TASK
 * ----------------------------------------
 */
dataCorrectionRouter.patch(
    "/:taskId/start",
    authenticate,
    authorizeRoles(
        "IMPORT_OFFICER"
    ),
    startDataCorrectionTask
);

/*
 * ----------------------------------------
 * IMPORT OFFICER - SUBMIT CORRECTED UPLOAD
 * ----------------------------------------
 *
 * multipart/form-data:
 * - file
 * - mapping (JSON text)
 * - importOfficerNote
 */
dataCorrectionRouter.post(
    "/:taskId/corrected-upload",
    authenticate,
    authorizeRoles(
        "IMPORT_OFFICER"
    ),
    uploadFile,
    submitCorrectedUpload
);

/*
 * ----------------------------------------
 * CORRECTION TASK BY CASE
 * ----------------------------------------
 */
dataCorrectionRouter.get(
    "/case/:caseId",
    authenticate,
    authorizeRoles(
        "CHECKER",
        "IMPORT_OFFICER",
        "ADMIN",
        "OPERATIONS_MANAGER",
        "AUDITOR"
    ),
    getDataCorrectionTaskByCase
);

/*
 * ----------------------------------------
 * CHECKER -> IMPORT OFFICER HANDOFF
 * ----------------------------------------
 *
 * APPROVED Data Quality Case
 *      ↓
 * DataCorrectionTask
 *      ↓
 * assigned Import Officer
 *
 * Case itself remains APPROVED.
 */
dataCorrectionRouter.post(
    "/case/:caseId/request",
    authenticate,
    authorizeRoles(
        "CHECKER"
    ),
    validateRequest(
        requestDataCorrectionSchema
    ),
    requestDataCorrection
);

export default dataCorrectionRouter;
