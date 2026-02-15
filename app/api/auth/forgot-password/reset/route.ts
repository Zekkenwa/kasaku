import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

export async function POST(req: Request) {
    try {
        const { phone, otp, password } = await req.json();

        if (!phone || !otp || !password) {
            return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
        }

        const { generateBlindIndex } = require("@/lib/encryption");
        const cleanPhone = phone.replace(/\D/g, "");
        const phoneHash = generateBlindIndex(cleanPhone);

        const user = await prisma.user.findUnique({
            where: { phoneHash },
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

        // Hash Password
        const passwordHash = await hash(password, 12);

        // Update User
        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                otpCode: null,
                otpExpiresAt: null,
            },
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Reset Password Error:", error);
        return NextResponse.json({ error: "Gagal mereset password" }, { status: 500 });
    }
}
