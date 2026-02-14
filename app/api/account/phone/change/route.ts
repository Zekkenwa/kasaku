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

    const { action, otp, newPhone } = await request.json();
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // 14-day limit check (optional, but good for consistency with email)
    const u = user as any;
    if (u.lastEmailChangeAt) { // Reusing for general "security changes" cooldown or could create lastPhoneChangeAt
        // For now, let's keep it simple or use a dedicated timestamp if added to schema later
    }

    const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = () => new Date(Date.now() + 5 * 60 * 1000);

    // Stage 1: Request OTP for current number
    if (action === "request_old_otp") {
        if (!user.phone) {
            return NextResponse.json({ error: "Anda belum memiliki nomor telepon terdaftar." }, { status: 400 });
        }

        const limitParams = await checkOtpRateLimit(user);
        if (!limitParams.allowed) {
            return NextResponse.json({ error: limitParams.error }, { status: 429 });
        }

        const otpCode = generateOtp();
        const otpExpiresAt = expiry();

        await prisma.user.update({
            where: { id: user.id },
            data: { otpCode, otpExpiresAt }
        });

        try {
            await sendWhatsAppOTP(user.phone, otpCode);
            await updateOtpRateLimit(user);
            return NextResponse.json({ success: true, message: "OTP dikirim ke nomor lama" });
        } catch (e) {
            return NextResponse.json({ error: "Gagal mengirim OTP" }, { status: 500 });
        }
    }

    // Stage 2: Verify OTP for current number
    if (action === "verify_old_otp") {
        if (!otp || user.otpCode !== otp || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
            return NextResponse.json({ error: "OTP salah atau kadaluarsa" }, { status: 400 });
        }

        // Mark as pre-verified using tempPhone
        await prisma.user.update({
            where: { id: user.id },
            data: {
                tempPhone: "PRE_VERIFIED",
                otpCode: null,
                otpExpiresAt: null
            }
        });

        return NextResponse.json({ success: true });
    }

    // Stage 3: Request OTP for new number
    if (action === "request_new_otp") {
        if (user.tempPhone !== "PRE_VERIFIED") {
            return NextResponse.json({ error: "Sesi verifikasi nomor lama tidak valid" }, { status: 400 });
        }
        if (!newPhone) return NextResponse.json({ error: "Nomor baru diperlukan" }, { status: 400 });

        const cleanPhone = newPhone.replace(/\D/g, "");

        // Check uniqueness
        const existing = await prisma.user.findFirst({
            where: { phone: cleanPhone, NOT: { id: user.id } }
        });
        if (existing) return NextResponse.json({ error: "Nomor sudah digunakan akun lain" }, { status: 400 });

        const limitParams = await checkOtpRateLimit(user);
        if (!limitParams.allowed) {
            return NextResponse.json({ error: limitParams.error }, { status: 429 });
        }

        const otpCode = generateOtp();
        const otpExpiresAt = expiry();

        await prisma.user.update({
            where: { id: user.id },
            data: {
                tempPhone: cleanPhone, // Store the actual new phone now
                otpCode,
                otpExpiresAt
            }
        });

        try {
            await sendWhatsAppOTP(cleanPhone, otpCode);
            await updateOtpRateLimit(user);
            return NextResponse.json({ success: true, message: "OTP dikirim ke nomor baru" });
        } catch (e) {
            return NextResponse.json({ error: "Gagal mengirim OTP" }, { status: 500 });
        }
    }

    // Stage 4: Confirm change with new OTP
    if (action === "confirm_change") {
        if (!user.tempPhone || user.tempPhone === "PRE_VERIFIED") {
            return NextResponse.json({ error: "Sesi tidak valid" }, { status: 400 });
        }
        if (!otp || user.otpCode !== otp || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
            return NextResponse.json({ error: "OTP salah atau kadaluarsa" }, { status: 400 });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                phone: user.tempPhone,
                tempPhone: null,
                otpCode: null,
                otpExpiresAt: null,
                otpAttempts: 0,
                otpBlockedUntil: null
            }
        });

        return NextResponse.json({ success: true });
    }

    // Reset verification session
    if (action === "reset_verification") {
        await prisma.user.update({
            where: { id: user.id },
            data: {
                tempPhone: null,
                otpCode: null,
                otpExpiresAt: null
            }
        });
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Aksi tidak valid" }, { status: 400 });
}
