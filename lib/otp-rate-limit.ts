import { prisma } from "@/lib/prisma";
import { User } from "@prisma/client";

export async function checkOtpRateLimit(user: User) {
    const now = new Date();

    // 1. Check if blocked
    if (user.otpBlockedUntil && user.otpBlockedUntil > now) {
        const diff = Math.ceil((user.otpBlockedUntil.getTime() - now.getTime()) / 60000);
        return {
            allowed: false,
            error: `Terlalu banyak percobaan. Mohon tunggu ${diff} menit atau hubungi support.`
        };
    }

    // 2. Check 3 minute delay
    if (user.otpLastSentAt) {
        const diffMs = now.getTime() - user.otpLastSentAt.getTime();
        if (diffMs < 3 * 60 * 1000) { // 3 minutes
            const waitSeconds = Math.ceil((180000 - diffMs) / 1000);
            return {
                allowed: false,
                error: `Mohon tunggu ${Math.floor(waitSeconds / 60)} menit ${waitSeconds % 60} detik sebelum kirim ulang.`
            };
        }
    }

    // If allowed, we update state (increment attempt)
    // BUT we must allow the caller to succeed first? 
    // Actually, usually we increment on SUCCESS of sending. 
    // But to be safe, we return allowed: true and let caller handle update.
    // However, logic for "5 attempts then block" needs to be handled.

    return { allowed: true };
}

export async function updateOtpRateLimit(user: User) {
    const now = new Date();
    let attempts = user.otpAttempts + 1;
    let blockedUntil = user.otpBlockedUntil;

    // Check if we should reset attempts (e.g. if last attempt was > 1 hour ago? User didn't specify reset time)
    // User said: "sampai 5 attempt otp delay antar attempt 3 menit ... setelah 5 attempt ... menunggu 10 menit"
    // Usually attempts reset after a successful verification or after the block expires.

    // If user was previously blocked and block expired, we should reset attempts?
    if (user.otpBlockedUntil && user.otpBlockedUntil < now) {
        attempts = 1;
        blockedUntil = null;
    }

    if (attempts >= 5) {
        blockedUntil = new Date(now.getTime() + 10 * 60 * 1000); // Block 10 mins
        attempts = 0; // Reset attempts after blocking? Or keep them? Usually reset after block expires.
        // Let's set attempts to 0 so when block expires they start fresh.
    }

    await prisma.user.update({
        where: { id: user.id },
        data: {
            otpLastSentAt: now,
            otpAttempts: attempts,
            otpBlockedUntil: blockedUntil
        }
    });

    return { blockedUntil };
}
