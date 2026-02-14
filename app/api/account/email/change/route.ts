
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppOTP } from "@/lib/whatsapp";
import { checkOtpRateLimit, updateOtpRateLimit } from "@/lib/otp-rate-limit";

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, otp, newEmail, phone } = await request.json();
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // 14-day limit check
    const u = user as any;
    if (u.lastEmailChangeAt) {
        const daysSinceChange = (Date.now() - new Date(u.lastEmailChangeAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceChange < 14) {
            const daysLeft = Math.ceil(14 - daysSinceChange);
            return NextResponse.json({ error: `Anda baru saja mengganti email. Tunggu ${daysLeft} hari lagi.` }, { status: 429 });
        }
    }

    if (action === "request_otp") {
        if (!user.phone) {
            return NextResponse.json({ error: "Anda belum menghubungkan nomor WhatsApp." }, { status: 400 });
        }

        const limitParams = await checkOtpRateLimit(user);
        if (!limitParams.allowed) {
            return NextResponse.json({ error: limitParams.error }, { status: 429 });
        }

        // Security Optimization: Verify input phone matches user phone
        if (!phone || phone.replace(/\D/g, "") !== user.phone?.replace(/\D/g, "")) {
            return NextResponse.json({ error: "Nomor WhatsApp tidak cocok dengan akun Anda." }, { status: 400 });
        }

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

        await prisma.user.update({
            where: { id: user.id },
            data: { otpCode, otpExpiresAt }
        });

        try {
            await sendWhatsAppOTP(user.phone, otpCode);
            await updateOtpRateLimit(user); // Optimization: Only update limit after successful send
            return NextResponse.json({ success: true, message: "OTP terkirim ke WhatsApp" });
        } catch (e) {
            console.error("Failed send OTP", e);
            return NextResponse.json({ error: "Gagal mengirim OTP" }, { status: 500 });
        }
    }

    if (action === "confirm_change") {
        if (!otp || !newEmail) {
            return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
        }

        // Verify OTP
        if (!user.otpCode || user.otpCode !== otp || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
            return NextResponse.json({ error: "Kode OTP salah atau kadaluarsa" }, { status: 400 });
        }

        // Check Email Format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
            return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 });
        }

        // Check Email Uniqueness
        const existing = await prisma.user.findUnique({ where: { email: newEmail } });
        if (existing) {
            return NextResponse.json({ error: "Email sudah digunakan" }, { status: 400 });
        }

        // Update Email & Timestamp
        await prisma.user.update({
            where: { id: user.id },
            data: {
                email: newEmail,
                lastEmailChangeAt: new Date(),
                otpCode: null,
                otpExpiresAt: null
            } as any
        });

        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
