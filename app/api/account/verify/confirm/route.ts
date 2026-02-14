import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { otp, optIn } = await req.json();
    if (!otp) return NextResponse.json({ error: "OTP required" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || !user.tempPhone) return NextResponse.json({ error: "Tidak ada permintaan verifikasi" }, { status: 400 });

    if (user.otpCode !== otp) return NextResponse.json({ error: "OTP Salah" }, { status: 400 });
    if (!user.otpExpiresAt || new Date() > user.otpExpiresAt) return NextResponse.json({ error: "OTP Kadaluarsa" }, { status: 400 });

    // Success
    await prisma.user.update({
        where: { email: session.user.email },
        data: {
            phone: user.tempPhone,
            tempPhone: null,
            otpCode: null,
            otpExpiresAt: null,
            monthlyReportOptIn: !!optIn,
            // Reset OTP attempts on success?
            otpAttempts: 0,
            otpBlockedUntil: null
        }
    });

    return NextResponse.json({ success: true });
}
