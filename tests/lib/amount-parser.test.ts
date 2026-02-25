import { describe, expect, it } from "vitest";
import { parseAmount } from "../../lib/amount-parser";

describe("parseAmount", () => {
    it("parses numeric suffix format", () => {
        expect(parseAmount("15k")).toBe(15000);
        expect(parseAmount("1.5jt")).toBe(1500000);
        expect(parseAmount("2 miliar")).toBe(2000000000);
    });

    it("parses natural language format", () => {
        expect(parseAmount("seratus ribu")).toBe(100000);
        expect(parseAmount("dua juta")).toBe(2000000);
        expect(parseAmount("se ratus")).toBe(100);
    });

    it("returns null for invalid inputs", () => {
        expect(parseAmount("abc")).toBeNull();
        expect(parseAmount("")).toBeNull();
    });
});
