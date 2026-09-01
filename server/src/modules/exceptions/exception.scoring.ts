export const calculateExceptionScore = (
    exceptionType: string
) => {
    let score = 0;
    const reasons: string[] = [];

    switch (exceptionType) {
        case "UNMATCHED":
            score += 70;
            reasons.push("Transaction is missing from the target system");
            break;

        case "AMOUNT_MISMATCH":
            score += 60;
            reasons.push("Transaction amounts do not match");
            break;

        case "STATUS_MISMATCH":
            score += 50;
            reasons.push("Transaction statuses do not match");
            break;

        case "AMOUNT_AND_STATUS_MISMATCH":
            score += 80;
            reasons.push("Both amount and status are inconsistent");
            break;

        case "PROBABLE_MATCH":
            score += 35;
            reasons.push("Transaction requires manual match confirmation");
            break;
    }

    return {
        score,
        reasons,
    };
};