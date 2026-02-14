import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { id } = await params;

    // Verify wallet belongs to user
    const wallet = await prisma.wallet.findUnique({
        where: { id },
    });

    if (!wallet || wallet.userId !== user.id) {
        return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    try {
        // 1. Unlink transactions (set walletId to null)
        await prisma.transaction.updateMany({
            where: { walletId: id },
            data: { walletId: null },
        });

        // Also unlink recurring transactions if any
        await prisma.recurringTransaction.updateMany({
            where: { walletId: id },
            data: { walletId: null },
        });

        // 2. Delete the wallet
        await prisma.wallet.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting wallet:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
