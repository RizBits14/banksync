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

export const normalizeReference = (value: unknown) => {
    return String(value ?? "")
        .trim()
        .toUpperCase()
        .replace(/[\s-]/g, "");
};

export const normalizeAccountNumber = (value: unknown) => {
    return String(value ?? "")
        .trim()
        .replace(/[\s-]/g, "");
};