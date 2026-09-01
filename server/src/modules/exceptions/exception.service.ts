import { Exception } from "./exception.model.js";
import { calculateExceptionScore } from "./exception.scoring.js";
import { ReconciliationResult } from "../reconciliation/reconciliation-result.model.js";

export const generateExceptions = async (
    reconciliationId: string
) => {
    const results = await ReconciliationResult.find({
        reconciliationId,
        result: { $ne: "MATCHED" },
    });

    const exceptions = results.map((result) => {
        const { score, reasons } = calculateExceptionScore(
            result.result
        );

        return {
            reconciliationId: result.reconciliationId,
            reconciliationResultId: result._id,
            transactionId: result.sourceTransactionId,
            exceptionType: result.result,
            score,
            reasons,
        };
    });

    if (exceptions.length > 0) {
        await Exception.insertMany(exceptions);
    }

    return {
        generatedCount: exceptions.length,
    };
};