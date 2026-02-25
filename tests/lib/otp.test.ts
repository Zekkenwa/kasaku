import { describe, expect, it } from "vitest";
import { generateSecureOTP } from "../../lib/otp";

describe("generateSecureOTP", () => {
    it("always returns a 6 digit number string", () => {
        for (let index = 0; index < 50; index++) {
            const otp = generateSecureOTP();
            expect(otp).toMatch(/^\d{6}$/);
            expect(Number(otp)).toBeGreaterThanOrEqual(100000);
            expect(Number(otp)).toBeLessThanOrEqual(999999);
        }
    });
});
