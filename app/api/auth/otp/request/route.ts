
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppOTP } from "@/lib/whatsapp";
import { checkOtpRateLimit, updateOtpRateLimit } from "@/lib/otp-rate-limit";

export async function POST(req: Request) {
    const { phone } = await req.json();
    if (!phone) return NextResponse.json({ error: "Nomor WA diperlukan" }, { status: 400 });

    const { generateBlindIndex } = require("@/lib/encryption");
    const cleanPhone = phone.replace(/\D/g, "");
    const phoneHash = generateBlindIndex(cleanPhone);

    // 1. Find User by PhoneHash (the ONLY reliable way to search encrypted phone data)
    // Note: AES-256-GCM uses random IVs, so direct encrypted phone comparison is impossible.
    const user = await prisma.user.findFirst({ where: { phoneHash } });

    if (!user) {
        return NextResponse.json({ error: "Nomor ini belum terdaftar." }, { status: 404 });
    }

    // 2. Rate Limit Check
    const limitParams = await checkOtpRateLimit(user.id, "LOGIN");
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
    await updateOtpRateLimit(user.id, "LOGIN");

    // 4. Send OTP via WhatsApp
    try {
        await sendWhatsAppOTP(cleanPhone, otpCode);
    } catch (e) {
        return NextResponse.json({ error: "Gagal mengirim OTP ke WhatsApp. Silakan coba beberapa saat lagi." }, { status: 503 });
    }

    return NextResponse.json({ success: true, message: "OTP terkirim ke WhatsApp" });
}
