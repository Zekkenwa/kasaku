import { prisma } from "@/lib/prisma";

/**
 * Check OTP rate limit for a specific user + category.
 * Each category (LOGIN, PASSWORD, EMAIL, PHONE, VERIFY, REGISTER) has its own independent cooldown.
 */
export async function checkOtpRateLimit(userId: string, category: string) {
    const now = new Date();

    const record = await prisma.otpRateLimit.findUnique({
        where: { userId_category: { userId, category } },
    });

    if (!record) return { allowed: true };

    // 1. Check if blocked
    if (record.blockedUntil && record.blockedUntil > now) {
        const diff = Math.ceil((record.blockedUntil.getTime() - now.getTime()) / 60000);
        return {
            allowed: false,
            error: `Terlalu banyak percobaan. Mohon tunggu ${diff} menit atau hubungi support.`
        };
    }

    // 2. Check 3 minute delay
    if (record.lastSentAt) {
        const diffMs = now.getTime() - record.lastSentAt.getTime();
        if (diffMs < 3 * 60 * 1000) {
            const waitSeconds = Math.ceil((180000 - diffMs) / 1000);
            return {
                allowed: false,
                error: `Mohon tunggu ${Math.floor(waitSeconds / 60)} menit ${waitSeconds % 60} detik sebelum kirim ulang.`
            };
        }
    }

    return { allowed: true };
}

/**
 * Update OTP rate limit after successfully sending an OTP for a specific category.
 */
export async function updateOtpRateLimit(userId: string, category: string) {
    const now = new Date();

    const record = await prisma.otpRateLimit.findUnique({
        where: { userId_category: { userId, category } },
    });

    let attempts = (record?.attempts ?? 0) + 1;
    let blockedUntil: Date | null = record?.blockedUntil ?? null;

    // If user was previously blocked and block expired, reset attempts
    if (blockedUntil && blockedUntil < now) {
        attempts = 1;
        blockedUntil = null;
    }

    if (attempts >= 5) {
        blockedUntil = new Date(now.getTime() + 10 * 60 * 1000); // Block 10 mins
        attempts = 0;
    }

    await prisma.otpRateLimit.upsert({
        where: { userId_category: { userId, category } },
        create: {
            userId,
            category,
            lastSentAt: now,
            attempts,
            blockedUntil,
        },
        update: {
            lastSentAt: now,
            attempts,
            blockedUntil,
        },
    });

    return { blockedUntil };
}
