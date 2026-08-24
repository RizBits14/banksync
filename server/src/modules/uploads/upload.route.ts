import { Router } from "express";

import {
    createUpload,
    getUploads,
} from "./upload.controller.js";
import { uploadFile } from "./upload.middleware.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/authorizeRoles.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { uploadSchema } from "./upload.validation.js";

const uploadRouter = Router();

uploadRouter.post(
    "/",
    authenticate,
    authorizeRoles("ADMIN", "IMPORT_OFFICER"),
    uploadFile.single("file"),
    validateRequest(uploadSchema),
    createUpload
);

uploadRouter.get(
    "/",
    authenticate,
    authorizeRoles("ADMIN", "IMPORT_OFFICER"),
    getUploads
);

export default uploadRouter;