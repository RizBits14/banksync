import "dotenv/config";

import mongoose from "mongoose";
import { connectDB } from "../config/db.js";

const resetDatabase = async () => {
    try {
        // Safety: never allow this script in production.
        if (process.env.NODE_ENV === "production") {
            throw new Error(
                "Database reset is disabled in production"
            );
        }

        await connectDB();

        const db = mongoose.connection.db;

        if (!db) {
            throw new Error(
                "Database connection is not available"
            );
        }

        // Extra safety check.
        if (db.databaseName !== "banksync") {
            throw new Error(
                `Refusing to reset unexpected database: ${db.databaseName}`
            );
        }

        console.log(
            `\nResetting database: ${db.databaseName}\n`
        );

        const collections =
            await db.collections();

        for (const collection of collections) {
            const result =
                await collection.deleteMany({});

            console.log(
                `Cleared ${collection.collectionName} -> ${result.deletedCount} document(s)`
            );
        }

        console.log(
            "\nBankSync database reset completed successfully."
        );
    } catch (error) {
        console.error(
            "\nDatabase reset failed:",
            error
        );

        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};

void resetDatabase();