import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppOTP } from "@/lib/whatsapp";
import { checkOtpRateLimit, updateOtpRateLimit } from "@/lib/otp-rate-limit";

export async function POST(req: Request) {
    try {
        const { phone } = await req.json();

        if (!phone) {
            return NextResponse.json({ error: "Nomor WhatsApp wajib diisi" }, { status: 400 });
        }

        // Clean phone and generate hash
        const { generateBlindIndex } = require("@/lib/encryption");
        const cleanPhone = phone.replace(/\D/g, "");
        const phoneHash = generateBlindIndex(cleanPhone);

        const user = await prisma.user.findUnique({
            where: { phoneHash },
        });

        if (!user) {
            return NextResponse.json({ error: "Nomor belum terdaftar" }, { status: 404 });
        }

        // 1. Rate Limit Check
        const limitParams = await checkOtpRateLimit(user);
        if (!limitParams.allowed) {
            return NextResponse.json({ error: limitParams.error }, { status: 429 });
        }

        // Generate OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

        // Update User
        await prisma.user.update({
            where: { id: user.id },
            data: {
                otpCode,
                otpExpiresAt,
            },
        });

        // 2. Update Rate Limit Stats
        await updateOtpRateLimit(user);

        // Send OTP
        const sent = await sendWhatsAppOTP(cleanPhone, otpCode);
        if (!sent) {
            return NextResponse.json({ error: "Gagal mengirim OTP. Server WhatsApp sedang tidak tersedia, coba beberapa saat lagi." }, { status: 503 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Request Reset Error:", error);
        return NextResponse.json({ error: "Gagal memproses permintaan" }, { status: 500 });
    }
}
