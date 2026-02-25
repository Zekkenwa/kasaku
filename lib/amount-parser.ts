export function parseAmount(input: string): number | null {
    if (!input) return null;
    let str = input.toLowerCase().trim();

    const numberWords: Record<string, number> = {
        satu: 1,
        se: 1,
        dua: 2,
        tiga: 3,
        empat: 4,
        lima: 5,
        enam: 6,
        tujuh: 7,
        delapan: 8,
        sembilan: 9,
        sepuluh: 10,
        sebelas: 11,
        seratus: 100,
        seribu: 1000,
        setengah: 0.5,
        nol: 0,
    };

    const magnitudes: Record<string, number> = {
        belas: 10,
        puluh: 10,
        ratus: 100,
        ribu: 1000,
        juta: 1000000,
        miliar: 1000000000,
        triliun: 1000000000000,
    };

    const words = str.split(/[\s-]+/);
    const hasWord = words.some((word) => numberWords[word] !== undefined || magnitudes[word] !== undefined);
    const hasDigit = /\d/.test(str);

    if (hasWord && !hasDigit) {
        let total = 0;
        let current = 0;

        for (let index = 0; index < words.length; index++) {
            const word = words[index];
            const value = numberWords[word];

            if (value !== undefined) {
                if (word === "se" && words[index + 1] && magnitudes[words[index + 1]]) {
                    current += 1;
                } else {
                    current += value;
                }
            } else if (magnitudes[word]) {
                if (current === 0 && (word === "ribu" || word === "juta" || word === "miliar")) {
                    current = 1;
                }

                if (word === "belas") {
                    current += 10;
                } else if (word === "puluh" || word === "ratus") {
                    current = (current === 0 ? 1 : current) * magnitudes[word];
                } else {
                    total += (current === 0 ? 1 : current) * magnitudes[word];
                    current = 0;
                }
            }
        }

        return total + current;
    }

    str = str.replace(/rp\.?|idr/g, "").trim();

    const hasSuffix = /(k|rb|ribu|jt|juta|m|miliar)$/i.test(str);
    if (hasSuffix) {
        str = str.replace(/,/g, ".");
    } else {
        str = str.replace(/\./g, "").replace(/,/g, ".");
    }

    const regex = /^([\d.]+)\s*(k|rb|ribu|jt|juta|m|miliar)?$/i;
    const match = str.match(regex);

    if (!match) return null;

    const value = parseFloat(match[1]);
    const suffix = match[2]?.toLowerCase();
    let multiplier = 1;

    if (suffix === "k" || suffix === "rb" || suffix === "ribu") {
        multiplier = 1000;
    } else if (suffix === "jt" || suffix === "juta") {
        multiplier = 1000000;
    } else if (suffix === "m" || suffix === "miliar") {
        multiplier = 1000000000;
    }

    return Number.isNaN(value) ? null : value * multiplier;
}
