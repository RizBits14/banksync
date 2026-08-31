export const calculateStringSimilarity = (
    first: string,
    second: string
) => {
    const a = first.toUpperCase();
    const b = second.toUpperCase();

    if (a === b) {
        return 1;
    }

    const maxLength = Math.max(a.length, b.length);

    if (maxLength === 0) {
        return 1;
    }

    let matches = 0;

    for (let i = 0; i < Math.min(a.length, b.length); i++) {
        if (a[i] === b[i]) {
            matches++;
        }
    }

    return matches / maxLength;
};