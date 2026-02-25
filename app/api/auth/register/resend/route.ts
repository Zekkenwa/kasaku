import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppOTP } from "@/lib/whatsapp";
import { checkOtpRateLimit, updateOtpRateLimit } from "@/lib/otp-rate-limit";
import { generateSecureOTP } from "@/lib/otp";

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: "Email wajib diisi" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
        }

        // 1. Rate Limit Check
        const limitParams = await checkOtpRateLimit(user.id, "REGISTER");
        if (!limitParams.allowed) {
            return NextResponse.json({ error: limitParams.error }, { status: 429 });
        }

        // Generate OTP
        const otpCode = generateSecureOTP();
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
        await updateOtpRateLimit(user.id, "REGISTER");

        // Send OTP via WhatsApp
        // Prisma middleware already decrypts phone/tempPhone on reads, so no manual decrypt needed.
        let phoneToSend = user.tempPhone || user.phone;
        if (!phoneToSend) {
            return NextResponse.json({ error: "Nomor WhatsApp tidak ditemukan pada akun ini." }, { status: 400 });
        }

        const sent = await sendWhatsAppOTP(phoneToSend as string, otpCode);
        if (!sent) {
            return NextResponse.json({ error: "Gagal mengirim OTP ke WhatsApp. Silakan coba beberapa saat lagi." }, { status: 503 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Resend OTP Error:", error);
        return NextResponse.json({ error: "Gagal mengirim OTP" }, { status: 500 });
    }
}
