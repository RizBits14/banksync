import { Router } from "express";

const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
    res.status(200).json({
        success: true,
        message: "BankSync API is healthy",
    });
});

export default healthRouter;