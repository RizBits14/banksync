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
            const { score, reasons } =
                calculateExceptionScore(
                    result.result
                );

            return {
                reconciliationId:
                    result.reconciliationId,

                reconciliationResultId:
                    result._id,

                transactionId:
                    result.sourceTransactionId,

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

    const createdExceptions =
        await Exception.insertMany(
            exceptionData
        );

    for (const exception of createdExceptions) {
        await createCaseFromException(
            exception._id.toString()
        );
    }

    return {
        generatedCount:
            createdExceptions.length,

        caseCount:
            createdExceptions.length,
    };
};