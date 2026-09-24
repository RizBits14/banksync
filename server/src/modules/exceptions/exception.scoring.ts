export interface SeverityBreakdownItem {
    label: string;
    score: number;
    maxScore: number;
    explanation: string;
}

export interface ExceptionScoreResult {
    score: number;
    reasons: string[];
    breakdown: SeverityBreakdownItem[];
}

export const calculateExceptionScore = (
    exceptionType: string,
    missingFrom: "source" | "target" = "target"
): ExceptionScoreResult => {
    const reasons: string[] = [];
    const breakdown: SeverityBreakdownItem[] = [];

    switch (exceptionType) {
        case "UNMATCHED": {
            breakdown.push(
                {
                    label: "Core reconciliation failure",
                    score: 40,
                    maxScore: 40,
                    explanation:
                        "The reconciliation engine could not establish a complete source-to-target transaction match.",
                },
                {
                    label: "Missing counterpart transaction",
                    score: 20,
                    maxScore: 20,
                    explanation:
                        `The transaction exists on one side of the reconciliation but no corresponding transaction was found in the ${missingFrom} dataset.`,
                },
                {
                    label: "Manual investigation required",
                    score: 10,
                    maxScore: 10,
                    explanation:
                        "The discrepancy cannot be automatically resolved and requires Maker investigation before the case can proceed.",
                }
            );

            reasons.push(
                `Transaction is missing from the ${missingFrom} system`
            );

            break;
        }

        case "AMOUNT_MISMATCH": {
            breakdown.push(
                {
                    label: "Reconciliation inconsistency",
                    score: 30,
                    maxScore: 30,
                    explanation:
                        "The reconciliation engine identified related transactions, but they are not fully consistent.",
                },
                {
                    label: "Financial amount discrepancy",
                    score: 20,
                    maxScore: 20,
                    explanation:
                        "The source and target transaction amounts are different, creating a financial reconciliation risk.",
                },
                {
                    label: "Manual investigation required",
                    score: 10,
                    maxScore: 10,
                    explanation:
                        "The amount discrepancy requires investigation before the transaction can be accepted or corrected.",
                }
            );

            reasons.push(
                "Transaction amounts do not match"
            );

            break;
        }

        case "STATUS_MISMATCH": {
            breakdown.push(
                {
                    label: "Reconciliation inconsistency",
                    score: 25,
                    maxScore: 25,
                    explanation:
                        "The reconciliation engine identified related transactions, but their states are inconsistent.",
                },
                {
                    label: "Transaction status discrepancy",
                    score: 15,
                    maxScore: 15,
                    explanation:
                        "The source and target systems report different transaction statuses.",
                },
                {
                    label: "Manual investigation required",
                    score: 10,
                    maxScore: 10,
                    explanation:
                        "The status inconsistency requires investigation before the final transaction state can be confirmed.",
                }
            );

            reasons.push(
                "Transaction statuses do not match"
            );

            break;
        }

        case "AMOUNT_AND_STATUS_MISMATCH": {
            breakdown.push(
                {
                    label: "Reconciliation inconsistency",
                    score: 30,
                    maxScore: 30,
                    explanation:
                        "The reconciliation engine identified related transactions with multiple inconsistencies.",
                },
                {
                    label: "Financial amount discrepancy",
                    score: 20,
                    maxScore: 20,
                    explanation:
                        "The transaction amounts differ between the two reconciliation sides.",
                },
                {
                    label: "Transaction status discrepancy",
                    score: 15,
                    maxScore: 15,
                    explanation:
                        "The transaction statuses differ between the source and target systems.",
                },
                {
                    label: "Multiple discrepancy impact",
                    score: 5,
                    maxScore: 5,
                    explanation:
                        "More than one material transaction field is inconsistent, increasing investigation complexity.",
                },
                {
                    label: "Manual investigation required",
                    score: 10,
                    maxScore: 10,
                    explanation:
                        "The combined discrepancies require manual investigation before resolution.",
                }
            );

            reasons.push(
                "Both amount and status are inconsistent"
            );

            break;
        }

        case "PROBABLE_MATCH": {
            breakdown.push(
                {
                    label: "Match uncertainty",
                    score: 15,
                    maxScore: 15,
                    explanation:
                        "The reconciliation engine found a possible transaction pair but could not classify it as an exact match.",
                },
                {
                    label: "Transaction similarity ambiguity",
                    score: 10,
                    maxScore: 10,
                    explanation:
                        "Some transaction attributes are similar, but the available evidence is insufficient for automatic confirmation.",
                },
                {
                    label: "Manual confirmation required",
                    score: 10,
                    maxScore: 10,
                    explanation:
                        "A Maker must review the candidate pair before it can be accepted as a confirmed match.",
                }
            );

            reasons.push(
                "Transaction requires manual match confirmation"
            );

            break;
        }

        default: {
            breakdown.push({
                label: "Unclassified exception",
                score: 0,
                maxScore: 100,
                explanation:
                    "No severity scoring rule is configured for this exception type.",
            });

            reasons.push(
                "No severity rule is configured for this exception type"
            );
        }
    }

    const score = breakdown.reduce(
        (total, item) =>
            total + item.score,
        0
    );

    return {
        score,
        reasons,
        breakdown,
    };
};