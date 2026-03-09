export type SpamVerdict = 'clean' | 'warn' | 'throttle' | 'ban';

interface UserSpamState {
    timestamps: number[];
    recentMessages: string[];
    score: number;
    lastActivity: number;
    lastWarning: number;
    banned: boolean;
}

const spamStateMap = new Map<string, UserSpamState>();

// Configuration
const WINDOW_MS = 30 * 1000;           // 30s sliding window
const BURST_WINDOW_MS = 5 * 1000;      // 5s for burst detection
const BURST_THRESHOLD = 4;             // >4 msgs in 5s = burst
const FLOOD_THRESHOLD = 10;            // >10 msgs in 30s = sustained flood
const IDENTICAL_WINDOW_MS = 3000;      // 3s for rapid-fire identical check
const IDENTICAL_THRESHOLD = 3;         // 3 identical msgs in 3s = very suspicious
const DUPLICATE_RATIO = 0.7;           // >70% identical in recent window = forward bomb
const DUPLICATE_WINDOW_SIZE = 10;      // Number of recent messages to track for duplicates
const SCORE_DECAY_PER_SEC = 0.5;       // Score decay: 0.5 pts/sec when idle
const BAN_THRESHOLD = 100;             // score >= 100 → permanent ban
const THROTTLE_THRESHOLD = 70;         // score >= 70 → silent drop (no more warnings)
const WARN_THRESHOLD = 50;             // score >= 50 → send warning
const WARN_COOLDOWN_MS = 60 * 1000;    // 60s cooldown between warnings

// Score increments per detected behaviour
const SCORE_BURST = 15;                // Per message while in burst
const SCORE_FLOOD = 20;                // Per message while in flood
const SCORE_RAPID_IDENTICAL = 30;      // Bonus for 3 identical in 3s
const SCORE_FORWARD_BOMB = 15;         // Bonus for >70% duplicate in recent msgs

function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + c;
        hash |= 0;
    }
    return hash.toString(36);
}

function getOrCreateState(jid: string): UserSpamState {
    if (!spamStateMap.has(jid)) {
        spamStateMap.set(jid, {
            timestamps: [],
            recentMessages: [],
            score: 0,
            lastActivity: 0,
            lastWarning: 0,
            banned: false,
        });
    }
    return spamStateMap.get(jid)!;
}

function applyDecay(state: UserSpamState, now: number): void {
    if (state.lastActivity > 0) {
        const idleSecs = (now - state.lastActivity) / 1000;
        state.score = Math.max(0, state.score - idleSecs * SCORE_DECAY_PER_SEC);
    }
}

export function checkSpam(jid: string, text: string): SpamVerdict {
    const now = Date.now();
    const state = getOrCreateState(jid);

    if (state.banned) return 'ban';

    // Apply score decay since last activity
    applyDecay(state, now);
    state.lastActivity = now;

    // Update sliding window timestamps
    state.timestamps.push(now);
    state.timestamps = state.timestamps.filter(t => now - t <= WINDOW_MS);

    // Track recent message hashes for duplicate detection
    const hash = simpleHash(text.toLowerCase().trim());
    state.recentMessages.push(hash);
    if (state.recentMessages.length > DUPLICATE_WINDOW_SIZE) {
        state.recentMessages.shift();
    }

    let scoreIncrease = 0;

    // Burst detection: >4 messages in 5s
    const burstCount = state.timestamps.filter(t => now - t <= BURST_WINDOW_MS).length;
    if (burstCount > BURST_THRESHOLD) {
        scoreIncrease += SCORE_BURST;
    }

    // Sustained flood: >10 messages in 30s
    if (state.timestamps.length > FLOOD_THRESHOLD) {
        scoreIncrease += SCORE_FLOOD;
    }

    // Rapid-fire identical: 3+ identical messages in <3s
    const rapidCount = state.timestamps.filter(t => now - t <= IDENTICAL_WINDOW_MS).length;
    if (rapidCount >= IDENTICAL_THRESHOLD) {
        const lastN = state.recentMessages.slice(-IDENTICAL_THRESHOLD);
        if (lastN.length === IDENTICAL_THRESHOLD && lastN.every(h => h === hash)) {
            scoreIncrease += SCORE_RAPID_IDENTICAL;
        }
    }

    // Forward bomb: >70% of recent messages are identical
    if (state.recentMessages.length >= 5) {
        const hashCounts = new Map<string, number>();
        for (const h of state.recentMessages) {
            hashCounts.set(h, (hashCounts.get(h) || 0) + 1);
        }
        const maxCount = Math.max(...hashCounts.values());
        if (maxCount / state.recentMessages.length > DUPLICATE_RATIO) {
            scoreIncrease += SCORE_FORWARD_BOMB;
        }
    }

    state.score += scoreIncrease;

    // Determine verdict
    if (state.score >= BAN_THRESHOLD) {
        state.banned = true;
        return 'ban';
    }

    if (state.score >= THROTTLE_THRESHOLD) {
        return 'throttle';
    }

    if (state.score >= WARN_THRESHOLD) {
        const canWarn = now - state.lastWarning >= WARN_COOLDOWN_MS;
        if (canWarn) {
            state.lastWarning = now;
            return 'warn';
        }
        return 'throttle';
    }

    return 'clean';
}

export function resetSpamState(jid: string): void {
    spamStateMap.delete(jid);
}
