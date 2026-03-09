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

    it("parses milyar variants", () => {
        expect(parseAmount("2milyar")).toBe(2000000000);
        expect(parseAmount("1.5mlr")).toBe(1500000000);
        expect(parseAmount("3mly")).toBe(3000000000);
        expect(parseAmount("5mi")).toBe(5000000000);
    });

    it("parses triliun variants", () => {
        expect(parseAmount("1t")).toBe(1000000000000);
        expect(parseAmount("2.5tr")).toBe(2500000000000);
        expect(parseAmount("1tril")).toBe(1000000000000);
        expect(parseAmount("3triliun")).toBe(3000000000000);
    });

    it("parses biliun/bio variants", () => {
        expect(parseAmount("1b")).toBe(1000000000);
        expect(parseAmount("2bio")).toBe(2000000000);
        expect(parseAmount("1biliun")).toBe(1000000000);
    });

    it("parses compound teen numbers in words", () => {
        expect(parseAmount("duabelas ribu")).toBe(12000);
        expect(parseAmount("limabelas juta")).toBe(15000000);
    });

    it("parses natural language milyar", () => {
        expect(parseAmount("dua milyar")).toBe(2000000000);
    });
});
