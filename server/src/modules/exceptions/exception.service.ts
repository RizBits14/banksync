import mongoose from "mongoose";

import { Exception } from "./exception.model.js";
import { calculateExceptionScore } from "./exception.scoring.js";

import { ReconciliationResult } from "../reconciliation/reconciliation-result.model.js";

import { createCaseFromException } from "../cases/case.service.js";

export const generateExceptions = async (
    reconciliationId: string
) => {
    const results =
        await ReconciliationResult.find({
            reconciliationId,
            result: {
                $ne: "MATCHED",
            },
        });

    const exceptionData = results.map(
        (result) => {
            const transactionId =
                result.sourceTransactionId ??
                result.targetTransactionId;

            if (!transactionId) {
                throw new Error(
                    `Reconciliation result ${result._id.toString()} has no transaction reference`
                );
            }

            const missingFrom =
                result.sourceTransactionId
                    ? "target"
                    : "source";

            const { score, reasons } =
                calculateExceptionScore(
                    result.result,
                    missingFrom
                );

            return {
                reconciliationId:
                    result.reconciliationId,

                reconciliationResultId:
                    result._id,

                transactionId,

                exceptionType:
                    result.result,

                score,
                reasons,
            };
        }
    );

    if (exceptionData.length === 0) {
        return {
            generatedCount: 0,
            caseCount: 0,
        };
    }

    // Wait for the unique index before creating any exceptions.
    await Exception.init();

    let generatedCount = 0;
    let caseCount = 0;

    for (const data of exceptionData) {
        const now = new Date();
        let exception;

        try {
            const outcome = await Exception.findOneAndUpdate(
                {
                    reconciliationResultId: data.reconciliationResultId,
                },
                {
                    $setOnInsert: {
                        ...data,
                        status: "OPEN",
                        createdAt: now,
                        updatedAt: now,
                    },
                },
                {
                    upsert: true,
                    returnDocument: "after",
                    includeResultMetadata: true,
                    runValidators: true,
                    setDefaultsOnInsert: true,
                    timestamps: false,
                }
            );

            exception = outcome.value;

            if (outcome.lastErrorObject?.upserted) {
                generatedCount++;
            }
        } catch (error) {
            if (
                error instanceof mongoose.mongo.MongoServerError &&
                error.code === 11000 &&
                error.keyPattern?.reconciliationResultId
            ) {
                exception = await Exception.findOne({
                    reconciliationResultId: data.reconciliationResultId,
                });
            } else {
                throw error;
            }

            if (!exception) {
                throw error;
            }
        }

        if (!exception) {
            throw new Error("Unable to create or retrieve exception");
        }

        await createCaseFromException(
            exception._id.toString()
        );

        caseCount++;
    }

    return {
        generatedCount,
        // Includes cases that already existed and were safely reused.
        caseCount,
    };
};
