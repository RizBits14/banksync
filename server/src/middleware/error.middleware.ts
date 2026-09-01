import type {
    Request,
    Response,
    NextFunction,
} from "express";

export const notFoundHandler = (
    req: Request,
    res: Response
) => {
    return res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
};

export const errorHandler = (
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
) => {
    console.error(
        "Unhandled application error:",
        error
    );

    const isProduction =
        process.env.NODE_ENV ===
        "production";

    return res.status(500).json({
        success: false,

        message: isProduction
            ? "Internal server error"
            : error instanceof Error
                ? error.message
                : "Internal server error",
    });
};