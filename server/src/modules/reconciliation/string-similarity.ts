const normalize = (
    value: string
) => {
    return value
        .toLowerCase()
        .replace(
            /[^a-z0-9]/g,
            ""
        );
};

const levenshteinDistance = (
    first: string,
    second: string
) => {
    const a = normalize(first);
    const b = normalize(second);

    if (a === b) {
        return 0;
    }

    if (!a.length) {
        return b.length;
    }

    if (!b.length) {
        return a.length;
    }

    const previous =
        Array.from(
            {
                length:
                    b.length + 1,
            },
            (_, index) => index
        );

    for (
        let i = 1;
        i <= a.length;
        i++
    ) {
        const current = [i];

        for (
            let j = 1;
            j <= b.length;
            j++
        ) {
            const cost =
                a[i - 1] ===
                    b[j - 1]
                    ? 0
                    : 1;

            current[j] =
                Math.min(
                    current[j - 1] + 1,
                    previous[j] + 1,
                    previous[j - 1] +
                    cost
                );
        }

        for (
            let j = 0;
            j < current.length;
            j++
        ) {
            previous[j] =
                current[j];
        }
    }

    return previous[b.length];
};

export const stringSimilarity = (
    first?: string | null,
    second?: string | null
) => {
    if (!first || !second) {
        return 0;
    }

    const normalizedFirst =
        normalize(first);

    const normalizedSecond =
        normalize(second);

    const longestLength =
        Math.max(
            normalizedFirst.length,
            normalizedSecond.length
        );

    if (longestLength === 0) {
        return 1;
    }

    const distance =
        levenshteinDistance(
            first,
            second
        );

    return Math.max(
        0,
        1 -
        distance /
        longestLength
    );
};