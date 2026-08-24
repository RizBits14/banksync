import { Router } from "express";

import { getTransactions } from "./transaction.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";

const transactionRouter = Router();

transactionRouter.get(
    "/",
    authenticate,
    getTransactions
);

export default transactionRouter;