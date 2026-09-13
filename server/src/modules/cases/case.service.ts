import mongoose from "mongoose";

import { Case } from "./case.model.js";
import { Exception } from "../exceptions/exception.model.js";

const determinePriority = (score: number) => {
    if (score >= 80) {
        return "CRITICAL";
    }

    if (score >= 60) {
        return "HIGH";
    }

    if (score >= 40) {
        return "MEDIUM";
    }

    return "LOW";
};

export const createCaseFromException = async (
    exceptionId: string
) => {
    const exception = await Exception.findById(exceptionId);

    if (!exception) {
        throw new Error("Exception not found");
    }

    const now = new Date();

    try {
        const caseRecord = await Case.findOneAndUpdate(
            {
                exceptionId: exception._id,
            },
            {
                $setOnInsert: {
                    exceptionId: exception._id,
                    priority: determinePriority(exception.score),
                    status: "OPEN",
                    createdAt: now,
                    updatedAt: now,
                },
            },
            {
                upsert: true,
                returnDocument: "after",
                runValidators: true,
                setDefaultsOnInsert: true,
                timestamps: false,
            }
        );

        if (!caseRecord) {
            throw new Error("Unable to create or retrieve case");
        }

        return caseRecord;
    } catch (error) {
        if (
            error instanceof mongoose.mongo.MongoServerError &&
            error.code === 11000 &&
            error.keyPattern?.exceptionId
        ) {
            const existingCase = await Case.findOne({
                exceptionId: exception._id,
            });

            if (existingCase) {
                return existingCase;
            }
        }

        throw error;
    }
};