
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Check if user has password or phone before unlinking to prevent lockout
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: { accounts: true },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const hasPassword = !!user.passwordHash;
        const hasPhone = !!user.phone;

        // If they have no other way to login, warn them?
        // User requested "just erase the feature... to unlink for privacy".
        // I will enforce safety: Must have Password OR Phone. Ref: "kasaku" uses phone login too.
        if (!hasPassword && !hasPhone) {
            return NextResponse.json({ error: "Anda harus memiliki Password atau Nomor WhatsApp terverifikasi sebelum memutuskan akun Google." }, { status: 400 });
        }

        // Delete Google Account
        const deleteResult = await prisma.account.deleteMany({
            where: {
                userId: session.user.id,
                provider: "google",
            },
        });

        if (deleteResult.count === 0) {
            return NextResponse.json({ error: "Tidak ada akun Google yang terhubung" }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Unlink error:", error);
        return NextResponse.json({ error: "Gagal memutuskan koneksi" }, { status: 500 });
    }
}
