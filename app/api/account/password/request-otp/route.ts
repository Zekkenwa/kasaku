import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppOTP } from "@/lib/whatsapp";
import { checkOtpRateLimit, updateOtpRateLimit } from "@/lib/otp-rate-limit";

export async function POST() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user || !user.phone) {
            return NextResponse.json({ error: "Nomor WhatsApp belum diverifikasi." }, { status: 400 });
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
            where: { email: user.email },
            data: {
                otpCode,
                otpExpiresAt,
            },
        });

        // 2. Update Rate Limit Stats
        await updateOtpRateLimit(user);

        // Send OTP
        await sendWhatsAppOTP(user.phone, otpCode);

        return NextResponse.json({ success: true, phone: user.phone });

    } catch (error) {
        console.error("Request Password OTP Error:", error);
        return NextResponse.json({ error: "Gagal mengirim OTP" }, { status: 500 });
    }
}
