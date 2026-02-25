import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await prisma.user.update({
            where: { email: session.user.email },
            data: {
                deleteRequestedAt: null,
                deleteScheduledAt: null,
            },
        });

        return NextResponse.json({ success: true, message: "Penghapusan akun dibatalkan." });
    } catch (error) {
        console.error("Failed to cancel account deletion:", error);
        return NextResponse.json({ error: "Terjadi kesalahan internal." }, { status: 500 });
    }
}
