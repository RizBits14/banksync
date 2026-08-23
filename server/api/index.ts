import type { IncomingMessage, ServerResponse } from "node:http";
import app from "../src/app.js";
import { connectDB } from "../src/config/db.js";

export default async function handler(
    req: IncomingMessage,
    res: ServerResponse
) {
    try {
        await connectDB();

        return app(req, res);
    } catch (error) {
        console.error("Database connection failed:", error);

        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");

        res.end(
            JSON.stringify({
                success: false,
                message: "Internal server error",
            })
        );
    }
}