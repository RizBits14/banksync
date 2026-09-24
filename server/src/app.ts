import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import healthRouter from "./modules/health/health.route.js";
import authRouter from "./modules/auth/auth.route.js";
import userRouter from "./modules/users/user.route.js";
import uploadRouter from "./modules/uploads/upload.route.js";
import transactionRouter from "./modules/transactions/transaction.route.js";
import reconciliationRouter from "./modules/reconciliation/reconciliation.route.js";
import exceptionRouter from "./modules/exceptions/exception.route.js";
import caseRouter from "./modules/cases/case.route.js";
import auditRouter from "./modules/audit/audit.route.js";
import dashboardRouter from "./modules/dashboard/dashboard.route.js";
import reportRouter from "./modules/reports/report.route.js";
import dataQualityRouter from "./modules/data-quality/data-quality.route.js";
import dataCorrectionRouter from "./modules/data-corrections/data-correction.route.js";
import accountRequestRouter from "./modules/account-requests/account-request.route.js";

import {
    auditRequest,
} from "./modules/audit/audit.middleware.js";

import {
    apiLimiter,
} from "./middleware/security.middleware.js";

import {
    errorHandler,
    notFoundHandler,
} from "./middleware/error.middleware.js";

const app = express();

app.use(helmet());

const allowedOrigins = (
    process.env.CLIENT_URLS ||
    process.env.CLIENT_URL ||
    "http://localhost:5173"
)
    .split(",")
    .map((origin) =>
        origin.trim()
    )
    .filter(Boolean);

app.set("trust proxy", 1);

app.use(
    cors({
        origin: (
            origin,
            callback
        ) => {
            if (!origin) {
                return callback(
                    null,
                    true
                );
            }

            if (
                allowedOrigins.includes(
                    origin
                )
            ) {
                return callback(
                    null,
                    true
                );
            }

            return callback(
                new Error(
                    "Origin not allowed by CORS"
                )
            );
        },

        credentials: true,
    })
);

app.use(
    express.json({
        limit: "1mb",
    })
);

app.use(cookieParser());

app.use(
    "/api",
    apiLimiter
);

app.use(auditRequest);

/*
 * Root health check
 */
app.get("/", (_req, res) => {
    res.status(200).json({
        success: true,
        message:
            "BankSync API is running",
    });
});

/*
 * Health
 */
app.use(
    "/api/health",
    healthRouter
);

/*
 * Authentication
 */
app.use(
    "/api/auth",
    authRouter
);

/*
 * Public account requests
 */
app.use(
    "/api/account-requests",
    accountRequestRouter
);

/*
 * Users
 */
app.use(
    "/api/users",
    userRouter
);

/*
 * Uploads
 */
app.use(
    "/api/uploads",
    uploadRouter
);

/*
 * Transactions
 */
app.use(
    "/api/transactions",
    transactionRouter
);

/*
 * Reconciliations
 */
app.use(
    "/api/reconciliations",
    reconciliationRouter
);

/*
 * Exceptions
 */
app.use(
    "/api/exceptions",
    exceptionRouter
);

/*
 * Cases
 */
app.use(
    "/api/cases",
    caseRouter
);

/*
 * Audit Logs
 */
app.use(
    "/api/audit-logs",
    auditRouter
);

/*
 * Dashboard
 */
app.use(
    "/api/dashboard",
    dashboardRouter
);

/*
 * Reports
 */
app.use(
    "/api/reports",
    reportRouter
);

/*
 * Data Quality
 */
app.use(
    "/api/data-quality",
    dataQualityRouter
);

/*
 * Data Corrections
 */
app.use(
    "/api/data-corrections",
    dataCorrectionRouter
);

/*
 * Error handling
 */
app.use(notFoundHandler);

app.use(errorHandler);

export default app;