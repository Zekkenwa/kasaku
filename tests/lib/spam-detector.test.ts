import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkSpam, resetSpamState } from "../../lib/spam-detector";

// Each test uses a unique JID to avoid state leakage between tests
let jidCounter = 0;
function newJid(): string {
    return `test${++jidCounter}@s.whatsapp.net`;
}

describe("spam-detector", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("returns clean for a single message", () => {
        const jid = newJid();
        expect(checkSpam(jid, "hello")).toBe("clean");
        resetSpamState(jid);
    });

    it("returns clean for messages spaced apart in time", () => {
        const jid = newJid();
        for (let i = 0; i < 5; i++) {
            vi.advanceTimersByTime(5000); // 5 seconds apart
            expect(checkSpam(jid, `message ${i}`)).toBe("clean");
        }
        resetSpamState(jid);
    });

    it("returns warn after rapid burst of messages", () => {
        const jid = newJid();
        // Send 8 messages very quickly (burst > 4 in 5s), each adds +15 to score
        // After 4 clean, messages 5-8 each add 15: 15+15+15+15 = 60 > warn threshold (50)
        let gotWarn = false;
        for (let i = 0; i < 10; i++) {
            vi.advanceTimersByTime(100); // 100ms apart
            const verdict = checkSpam(jid, `msg${i}`);
            if (verdict === "warn") {
                gotWarn = true;
                break;
            }
        }
        expect(gotWarn).toBe(true);
        resetSpamState(jid);
    });

    it("returns throttle after warn cooldown is active", () => {
        const jid = newJid();
        // Trigger warn first
        for (let i = 0; i < 10; i++) {
            vi.advanceTimersByTime(100);
            checkSpam(jid, `msg${i}`);
        }
        // Continue sending — should get throttle (warn cooldown active)
        let gotThrottle = false;
        for (let i = 0; i < 5; i++) {
            vi.advanceTimersByTime(100);
            const verdict = checkSpam(jid, `more${i}`);
            if (verdict === "throttle" || verdict === "ban") {
                gotThrottle = true;
                break;
            }
        }
        expect(gotThrottle).toBe(true);
        resetSpamState(jid);
    });

    it("returns ban after sustained heavy spam", () => {
        const jid = newJid();
        let gotBan = false;
        // Send many messages quickly to accumulate score >= 100
        for (let i = 0; i < 30; i++) {
            vi.advanceTimersByTime(50);
            const verdict = checkSpam(jid, `spam${i}`);
            if (verdict === "ban") {
                gotBan = true;
                break;
            }
        }
        expect(gotBan).toBe(true);
        resetSpamState(jid);
    });

    it("returns ban on every call once banned", () => {
        const jid = newJid();
        // Force a ban
        for (let i = 0; i < 30; i++) {
            vi.advanceTimersByTime(50);
            checkSpam(jid, `spam${i}`);
        }
        // After ban, all subsequent calls should return 'ban'
        vi.advanceTimersByTime(60000); // Wait a long time
        expect(checkSpam(jid, "innocent message")).toBe("ban");
        resetSpamState(jid);
    });

    it("score decays after idle period", () => {
        const jid = newJid();
        // Trigger some score increases
        for (let i = 0; i < 6; i++) {
            vi.advanceTimersByTime(100);
            checkSpam(jid, `msg${i}`);
        }
        // Wait a long time (120 seconds) — score should decay significantly
        vi.advanceTimersByTime(120000);
        // Now a single message should return clean (score decayed near 0)
        const verdict = checkSpam(jid, "after long wait");
        expect(verdict).toBe("clean");
        resetSpamState(jid);
    });

    it("detects rapid-fire identical messages", () => {
        const jid = newJid();
        let gotHighScore = false;
        // Send 3 identical messages within 3 seconds (each 500ms apart)
        for (let i = 0; i < 3; i++) {
            vi.advanceTimersByTime(500);
            const verdict = checkSpam(jid, "SAME MESSAGE");
            if (verdict === "warn" || verdict === "throttle" || verdict === "ban") {
                gotHighScore = true;
                break;
            }
        }
        // Might not trigger on exactly 3 messages alone (needs burst too),
        // but score should be elevated. Try a few more.
        if (!gotHighScore) {
            for (let i = 0; i < 5; i++) {
                vi.advanceTimersByTime(500);
                const verdict = checkSpam(jid, "SAME MESSAGE");
                if (verdict === "warn" || verdict === "throttle" || verdict === "ban") {
                    gotHighScore = true;
                    break;
                }
            }
        }
        expect(gotHighScore).toBe(true);
        resetSpamState(jid);
    });

    it("detects forward bomb (>70% identical messages)", () => {
        const jid = newJid();
        // Send 8 identical messages (out of 10), separated enough to avoid burst
        let gotHighScore = false;
        for (let i = 0; i < 10; i++) {
            vi.advanceTimersByTime(500);
            const msg = i < 8 ? "FORWARDED MESSAGE" : `unique ${i}`;
            const verdict = checkSpam(jid, msg);
            if (verdict === "warn" || verdict === "throttle" || verdict === "ban") {
                gotHighScore = true;
                break;
            }
        }
        expect(gotHighScore).toBe(true);
        resetSpamState(jid);
    });

    it("resetSpamState clears ban status", () => {
        const jid = newJid();
        // Force a ban
        for (let i = 0; i < 30; i++) {
            vi.advanceTimersByTime(50);
            checkSpam(jid, `spam${i}`);
        }
        expect(checkSpam(jid, "test")).toBe("ban");
        // Reset state
        resetSpamState(jid);
        // Should be clean after reset
        expect(checkSpam(jid, "innocent message")).toBe("clean");
        resetSpamState(jid);
    });
});
