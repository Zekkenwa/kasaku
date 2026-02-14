
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendWhatsAppOTP } from "@/lib/whatsapp";
import { checkOtpRateLimit, updateOtpRateLimit } from "@/lib/otp-rate-limit";
import { hash } from "bcryptjs";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, otp, newPassword } = await req.json();
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // --- ACTION: REQUEST OTP ---
    if (action === "request_otp") {
        if (!user.phone) {
            return NextResponse.json({ error: "Nomor WhatsApp belum terdaftar. Harap lengkapi profil." }, { status: 400 });
        }

        const limitParams = await checkOtpRateLimit(user);
        if (!limitParams.allowed) {
            return NextResponse.json({ error: limitParams.error }, { status: 429 });
        }

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await prisma.user.update({
            where: { id: user.id },
            data: { otpCode, otpExpiresAt }
        });

        try {
            await sendWhatsAppOTP(user.phone, otpCode);
            await updateOtpRateLimit(user);
            return NextResponse.json({ success: true, message: "OTP terkirim" });
        } catch (e) {
            return NextResponse.json({ error: "Gagal kirim WhatsApp" }, { status: 500 });
        }
    }

    // --- ACTION: CHANGE PASSWORD ---
    if (action === "change_password") {
        if (!otp || !newPassword) {
            return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
        }

        if (user.otpCode !== otp || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
            return NextResponse.json({ error: "OTP salah atau kadaluarsa" }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
        }

        const hashedPassword = await hash(newPassword, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash: hashedPassword,
                otpCode: null,
                otpExpiresAt: null,
            }
        });

        return NextResponse.json({ success: true, message: "Password berhasil diubah" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
