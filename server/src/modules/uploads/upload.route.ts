import { Router } from "express";

import { createUpload } from "./upload.controller.js";
import { uploadFile } from "./upload.middleware.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/authorizeRoles.js";

const uploadRouter = Router();

uploadRouter.post(
    "/",
    authenticate,
    authorizeRoles("ADMIN", "IMPORT_OFFICER"),
    uploadFile.single("file"),
    createUpload
);

export default uploadRouter;