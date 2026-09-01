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
import { auditRequest } from "./modules/audit/audit.middleware.js";
import dataQualityRouter from "./modules/data-quality/data-quality.route.js";

import {
    apiLimiter,
    authLimiter,
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


// This is the health route
app.get("/", (_req, res) => {
    res.status(200).json({
        success: true,
        message: "BankSync API is running",
    });
});


app.use("/api/health", healthRouter);

// This is the auth route
app.use(
    "/api/auth",
    authLimiter,
    authRouter
);

// This is the user route
app.use("/api/users", userRouter);

// This is the upload route
app.use("/api/uploads", uploadRouter);

// This is the transaction route
app.use("/api/transactions", transactionRouter);

// This is the reconciliations route
app.use("/api/reconciliations", reconciliationRouter);

// This is the exceptions route
app.use("/api/exceptions", exceptionRouter);

// This is the case route
app.use("/api/cases", caseRouter);

// This is the audit route
app.use("/api/audit-logs", auditRouter);

// This is the dashboard route
app.use("/api/dashboard", dashboardRouter);

// This is the report route
app.use("/api/reports", reportRouter);

// This is the data quality route
app.use("/api/data-quality", dataQualityRouter);

// Error handling route
app.use(notFoundHandler);

app.use(errorHandler);

export default app;