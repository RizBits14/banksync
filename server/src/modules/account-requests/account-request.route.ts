import { Router } from "express";

import {
    approveAccountRequest,
    createAccountRequest,
    getAccountRequests,
} from "./account-request.controller.js";

import {
    approveAccountRequestSchema,
    createAccountRequestSchema,
} from "./account-request.validation.js";

import {
    validateRequest,
} from "../../middleware/validateRequest.js";

import {
    authenticate,
} from "../../middleware/auth.middleware.js";

import {
    authorizeRoles,
} from "../../middleware/authorizeRoles.js";

const accountRequestRouter =
    Router();

/*
 * Employee submits request
 */
accountRequestRouter.post(
    "/",
    validateRequest(
        createAccountRequestSchema
    ),
    createAccountRequest
);

/*
 * Admin views requests
 */
accountRequestRouter.get(
    "/",
    authenticate,
    authorizeRoles("ADMIN"),
    getAccountRequests
);

/*
 * Admin approves request
 */
accountRequestRouter.post(
    "/:id/approve",
    authenticate,
    authorizeRoles("ADMIN"),
    validateRequest(
        approveAccountRequestSchema
    ),
    approveAccountRequest
);

export default accountRequestRouter;