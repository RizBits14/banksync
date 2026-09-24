import { Router } from "express";

import {
    createUpload,
    getUploads,
} from "./upload.controller.js";

import {
    downloadRejectedRows,
} from "./upload.rejected.controller.js";

import {
    deleteUpload,
} from "./upload.delete.controller.js";

import {
    archiveUpload,
} from "./upload.archive.controller.js";

import { uploadFile } from "./upload.middleware.js";

import { authenticate } from "../../middleware/auth.middleware.js";

import { authorizeRoles } from "../../middleware/authorizeRoles.js";

import { validateRequest } from "../../middleware/validateRequest.js";

import { uploadSchema } from "./upload.validation.js";

const uploadRouter = Router();

uploadRouter.post(
    "/",
    authenticate,
    authorizeRoles(
        "ADMIN",
        "IMPORT_OFFICER"
    ),
    uploadFile,
    validateRequest(uploadSchema),
    createUpload
);

uploadRouter.get(
    "/",
    authenticate,
    authorizeRoles(
        "ADMIN",
        "IMPORT_OFFICER"
    ),
    getUploads
);

uploadRouter.get(
    "/:id/rejected-rows",
    authenticate,
    authorizeRoles(
        "ADMIN",
        "IMPORT_OFFICER"
    ),
    downloadRejectedRows
);

uploadRouter.delete(
    "/:id",
    authenticate,
    authorizeRoles(
        "ADMIN",
        "IMPORT_OFFICER"
    ),
    deleteUpload
);

uploadRouter.patch(
    "/:id/archive",
    authenticate,
    authorizeRoles(
        "ADMIN"
    ),
    archiveUpload
);

export default uploadRouter;