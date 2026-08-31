import { calculateStringSimilarity } from "./reconciliation.similarity.js";

interface ProbableMatchInput {
    referenceNumber?: string | null;
    accountNumber?: string | null;
    amount: number;
    transactionDate: Date;
}

export const calculateProbableMatchScore = (
    source: ProbableMatchInput,
    target: ProbableMatchInput
) => {
    let score = 0;

    // Reference number = 35 points
    if (source.referenceNumber && target.referenceNumber) {
        score +=
            calculateStringSimilarity(
                source.referenceNumber,
                target.referenceNumber
            ) * 35;
    }

    // Account number = 25 points
    if (source.accountNumber && target.accountNumber) {
        score +=
            calculateStringSimilarity(
                source.accountNumber,
                target.accountNumber
            ) * 25;
    }

    // Amount = 25 points
    if (source.amount === target.amount) {
        score += 25;
    }

    // Transaction date = 15 points
    const dateDifference =
        Math.abs(
            source.transactionDate.getTime() -
            target.transactionDate.getTime()
        ) /
        (1000 * 60 * 60 * 24);

    if (dateDifference === 0) {
        score += 15;
    } else if (dateDifference <= 1) {
        score += 10;
    }

    return Math.round(score);
};