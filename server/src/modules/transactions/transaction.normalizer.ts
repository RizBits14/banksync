export const normalizeStatus = (status: unknown) => {
    const value = String(status ?? "")
        .trim()
        .toUpperCase();

    const statusMap: Record<string, string> = {
        SUCCESS: "SUCCESS",
        SUCCESSFUL: "SUCCESS",
        COMPLETED: "SUCCESS",
        APPROVED: "SUCCESS",

        FAILED: "FAILED",
        FAILURE: "FAILED",
        DECLINED: "FAILED",

        PENDING: "PENDING",
        PROCESSING: "PENDING",

        REVERSED: "REVERSED",
        REVERSAL: "REVERSED",
    };

    return statusMap[value] ?? value;
};

export const normalizeReference = (
    value: unknown
) => {
    return String(value ?? "")
        .trim()
        .toUpperCase()
        .replace(/[\s-]/g, "");
};

export const normalizeAccountNumber = (
    value: unknown
) => {
    return String(value ?? "")
        .trim()
        .replace(/[\s-]/g, "");
};

export const normalizeTransactionId = (
    value: unknown
) => {
    return String(value ?? "").trim();
};

export const normalizeAmount = (
    value: unknown
) => {
    if (
        typeof value === "number" &&
        Number.isFinite(value)
    ) {
        return String(value);
    }

    return String(value ?? "")
        .trim()
        .replace(/,/g, "");
};

const excelSerialToDate = (
    serial: number
) => {
    const excelEpoch = Date.UTC(
        1899,
        11,
        30
    );

    const milliseconds =
        serial * 24 * 60 * 60 * 1000;

    return new Date(
        excelEpoch + milliseconds
    );
};

export const normalizeTransactionDate = (
    value: unknown,
    timezoneOffset = "Z"
) => {
    if (value instanceof Date) {
        return value;
    }

    if (
        typeof value === "number" &&
        Number.isFinite(value) &&
        value > 0 &&
        value < 100000
    ) {
        return excelSerialToDate(value);
    }

    const dateValue = String(
        value ?? ""
    ).trim();

    if (!dateValue) {
        return dateValue;
    }

    // Standard date only:
    // 2026-09-15
    if (
        /^\d{4}-\d{2}-\d{2}$/.test(
            dateValue
        )
    ) {
        return dateValue;
    }

    // Already contains timezone:
    // 2026-09-15T09:10:00Z
    // 2026-09-15T09:10:00+06:00
    if (
        /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(
            dateValue
        )
    ) {
        return dateValue;
    }

    // Common timezone-less bank timestamp:
    // 2026-09-15T09:10:00
    // 2026-09-15 09:10:00
    const localDateTime =
        dateValue.match(
            /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(\.\d+)?)?$/
        );

    if (localDateTime) {
        const [
            ,
            date,
            hours,
            minutes,
            seconds = "00",
            fraction = "",
        ] = localDateTime;

        return `${date}T${hours}:${minutes}:${seconds}${fraction}${timezoneOffset}`;
    }

    return dateValue;
};