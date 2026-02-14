import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { otp, password } = await req.json();

        if (!otp || !password) {
            return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
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
            where: { email: user.email },
            data: {
                passwordHash,
                otpCode: null,
                otpExpiresAt: null,
            },
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Create Password Error:", error);
        return NextResponse.json({ error: "Gagal membuat password" }, { status: 500 });
    }
}
