import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendWhatsAppOTP } from "@/lib/whatsapp";
import { checkOtpRateLimit, updateOtpRateLimit } from "@/lib/otp-rate-limit";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { phone } = await req.json();
    if (!phone) return NextResponse.json({ error: "Phone required" }, { status: 400 });

    const cleanPhone = phone.replace(/\D/g, "");

    const { generateBlindIndex } = require("@/lib/encryption");
    const phoneHash = generateBlindIndex(cleanPhone);

    // Check if phone already used by OTHER user
    const existing = await prisma.user.findFirst({
        where: {
            phoneHash: phoneHash,
            NOT: { email: session.user.email }
        }
    });

    if (existing) {
        return NextResponse.json({ error: "Nomor sudah digunakan akun lain" }, { status: 400 });
    }

    // Get current user for rate limit check
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // 1. Rate Limit Check
    const limitParams = await checkOtpRateLimit(user);
    if (!limitParams.allowed) {
        return NextResponse.json({ error: limitParams.error }, { status: 429 });
    }

    // Generate OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    await prisma.user.update({
        where: { email: session.user.email },
        data: {
            tempPhone: cleanPhone,
            otpCode,
            otpExpiresAt
        }
    });

    // 2. Update Rate Limit Stats
    await updateOtpRateLimit(user);

    try {
        await sendWhatsAppOTP(cleanPhone, otpCode);
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("WA Error", e);
        return NextResponse.json({ error: "Gagal kirim WA" }, { status: 500 });
    }
}
