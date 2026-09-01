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

const app = express();

app.use(helmet());

app.use(
    cors({
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        credentials: true,
    })
);

app.use(express.json());
app.use(cookieParser());

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
app.use("/api/auth", authRouter)

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

export default app;