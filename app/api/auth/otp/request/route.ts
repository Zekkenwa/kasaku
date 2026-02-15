
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmailOTP } from "@/lib/email";
import { checkOtpRateLimit, updateOtpRateLimit } from "@/lib/otp-rate-limit";

export async function POST(req: Request) {
    const { phone } = await req.json();
    if (!phone) return NextResponse.json({ error: "Nomor WA diperlukan" }, { status: 400 });

    const { generateBlindIndex } = require("@/lib/encryption");
    const cleanPhone = phone.replace(/\D/g, "");
    const phoneHash = generateBlindIndex(cleanPhone);

    // 1. Find User by PhoneHash with fallback
    let user = await prisma.user.findFirst({ where: { phoneHash } });

    if (!user) {
        // Fallback: Check if user exists with plain phone (Self-healing for legacy/broken records)
        // Since the 'phone' field is encrypted by middleware on write, we need to encrypt it for search
        // BUT wait: our middleware doesn't encrypt for searches. We must manually encrypt for the fallback.
        const { encrypt } = require("@/lib/encryption");
        const encryptedPhone = encrypt(cleanPhone);

        console.log(`[AUTH] Searching by encrypted phone fallback: ${encryptedPhone}`);
        user = await prisma.user.findFirst({ where: { phone: encryptedPhone } });

        if (user) {
            console.log(`[AUTH] Healing user ${user.id}: creating missing phoneHash`);
            // Middleware will handle re-encryption and hash generation
            user = await prisma.user.update({
                where: { id: user.id },
                data: { phone: cleanPhone, phoneHash }
            });
        }
    }

    if (!user) {
        return NextResponse.json({ error: "Nomor ini belum terdaftar." }, { status: 404 });
    }

    // 2. Rate Limit Check
    const limitParams = await checkOtpRateLimit(user);
    if (!limitParams.allowed) {
        return NextResponse.json({ error: limitParams.error }, { status: 429 });
    }

    // 3. Generate OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    await prisma.user.update({
        where: { id: user.id },
        data: {
            otpCode,
            otpExpiresAt
        }
    });

    // 4. Update Rate Limit Stats
    await updateOtpRateLimit(user);

    // 4. Send OTP via Email
    const sent = await sendEmailOTP(user.email, otpCode);
    if (!sent) {
        return NextResponse.json({ error: "Gagal mengirim OTP ke email. Silakan coba beberapa saat lagi." }, { status: 503 });
    }

    return NextResponse.json({ success: true, message: "OTP terkirim ke WhatsApp" });
}
