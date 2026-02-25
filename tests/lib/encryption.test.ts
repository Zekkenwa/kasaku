import { beforeAll, describe, expect, it } from "vitest";

let encryption: typeof import("../../lib/encryption");

beforeAll(async () => {
    process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    encryption = await import("../../lib/encryption");
});

describe("encryption helpers", () => {
    it("encrypt/decrypt roundtrip works", () => {
        const original = "628123456789";
        const encrypted = encryption.encrypt(original);
        const decrypted = encryption.decrypt(encrypted);

        expect(encrypted).not.toBe(original);
        expect(decrypted).toBe(original);
    });

    it("blind index is stable across phone normalization", () => {
        const idxA = encryption.generateBlindIndex("0812-3456-789");
        const idxB = encryption.generateBlindIndex("628123456789");

        expect(idxA).toBe(idxB);
        expect(idxA).toMatch(/^[a-f0-9]{64}$/);
    });
});
