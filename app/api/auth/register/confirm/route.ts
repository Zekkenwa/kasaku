import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export async function POST(req: Request) {
    try {
        const { email, otp } = await req.json();

        if (!email || !otp) {
            return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
        }

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
        }

        // Verify OTP
        if (!user.otpCode || user.otpCode !== otp) {
            return NextResponse.json({ error: "Kode OTP Salah" }, { status: 400 });
        }

        if (!user.otpExpiresAt || new Date() > user.otpExpiresAt) {
            return NextResponse.json({ error: "Kode OTP Kadaluarsa" }, { status: 400 });
        }

        // Update User: Move tempPhone -> phone and generate phoneHash
        const { generateBlindIndex } = require("@/lib/encryption");
        const phone = user.tempPhone || "";
        const phoneHash = generateBlindIndex(phone);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                phone: phone, // Verified!
                phoneHash: phoneHash, // For quick lookup
                tempPhone: null,
                otpCode: null,
                otpExpiresAt: null,
                emailVerified: new Date(), // Consider email verified if they verified phone during reg? Optional.
            },
        });

        // Send Welcome Message & Onboarding
        try {
            const welcomeText = `👋 *Selamat datang di Bot Kasaku!*\n\nNomor Anda telah berhasil diverifikasi.\n\n⚠️ *PENTING:*\nSaldo Anda saat ini masih 0. Mohon masukkan *Saldo Awal* Anda agar dapat mulai mencatat pengeluaran.\n\n💡 *Contoh:*\n\`saldo awal 500k\`\n\`saldo awal 10jt\`\n\nKetik *help* kapan saja untuk bantuan lebih lanjut.`;
            await sendWhatsAppMessage(phone, welcomeText);
        } catch (error) {
            console.error("Failed to send welcome message after registration", error);
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Confirmation Error:", error);
        return NextResponse.json({ error: "Gagal verifikasi" }, { status: 500 });
    }
}
