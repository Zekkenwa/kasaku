import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { sendWhatsAppOTP } from "@/lib/whatsapp";

export async function POST(req: Request) {
    try {
        const { name, email, password, phone } = await req.json();

        if (!name || !email || !password || !phone) {
            return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
        }

        // 1. Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            // If user exists but has no phone/password (maybe from failed cleanup), we could handle it, 
            // but for now strict unique check.
            return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 400 });
        }

        // Check if phone number is already in use
        const existingPhone = await prisma.user.findFirst({
            where: { phone: phone },
        });

        if (existingPhone) {
            return NextResponse.json({ error: "Nomor WhatsApp sudah terdaftar" }, { status: 400 });
        }

        // 2. Hash password
        const passwordHash = await hash(password, 12);

        // 3. Generate OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        // console.log("DEV ONLY REGISTER OTP:", otpCode);
        const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

        // 4. Create User (Unverified Phone)
        const user = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
                tempPhone: phone,
                otpCode,
                otpExpiresAt,
                monthlyReportOptIn: false, // Default
            },
        });

        // 4b. Create Default Categories
        await prisma.category.createMany({
            data: [
                { userId: user.id, name: "Makan & Minum", type: "EXPENSE" },
                { userId: user.id, name: "Transportasi", type: "EXPENSE" },
                { userId: user.id, name: "Belanja", type: "EXPENSE" },
                { userId: user.id, name: "Hiburan", type: "EXPENSE" },
                { userId: user.id, name: "Tagihan", type: "EXPENSE" },
                { userId: user.id, name: "Lainnya", type: "EXPENSE" },
                { userId: user.id, name: "Gaji", type: "INCOME" },
                { userId: user.id, name: "Bonus", type: "INCOME" },
                { userId: user.id, name: "Lainnya", type: "INCOME" },
            ]
        });

        // 4c. Create Default Wallet
        await prisma.wallet.create({
            data: {
                userId: user.id,
                name: "Tunai",
                type: "CASH",
                initialBalance: 0,
            }
        });

        // 5. Send OTP
        const sent = await sendWhatsAppOTP(phone, otpCode);

        return NextResponse.json({
            success: true,
            email: user.email,
            otpSent: sent,
            ...(sent ? {} : { warning: "OTP gagal terkirim. Gunakan tombol 'Kirim Ulang' setelah beberapa saat." })
        });

    } catch (error) {
        console.error("Registration Error:", error);
        return NextResponse.json({ error: "Gagal mendaftar" }, { status: 500 });
    }
}
