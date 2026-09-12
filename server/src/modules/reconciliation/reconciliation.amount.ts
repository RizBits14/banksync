import mongoose from "mongoose";

const normalizeAmount = (amount: string): string => {
    const decimal = mongoose.Types.Decimal128
        .fromString(amount.trim())
        .toString();

    const parts = decimal.match(
        /^([+-]?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i
    );

    if (!parts) {
        throw new Error("Amount must be a finite decimal value");
    }

    const sign = parts[1] === "-" ? "-" : "";
    const fraction = parts[3] ?? "";
    const digits = (parts[2] + fraction).replace(/^0+/, "");

    if (digits === "") {
        return "0";
    }

    const significantDigits = digits.replace(/0+$/, "");

    // Only the exponent becomes a Number; amount digits remain text.
    const exponent =
        Number(parts[4] ?? "0") -
        fraction.length +
        (digits.length - significantDigits.length);

    return `${sign}${significantDigits}e${exponent}`;
};

export const areAmountsEqual = (
    left: string,
    right: string
): boolean => {
    return normalizeAmount(left) === normalizeAmount(right);
};