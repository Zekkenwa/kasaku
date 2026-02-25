import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-handler";

export const DELETE = withAuth(async (
    request: Request,
    userId: string,
    { params }: { params: Promise<{ id: string }> }
) => {
    const { id } = await params;

    // Verify wallet belongs to user
    const wallet = await prisma.wallet.findUnique({
        where: { id },
    });

    if (!wallet || wallet.userId !== userId) {
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
});

export const PUT = withAuth(async (
    request: Request,
    userId: string,
    { params }: { params: Promise<{ id: string }> }
) => {
    const { id } = await params;

    try {
        const json = await request.json();
        const { name, type, initialBalance } = json;

        // Verify wallet ownership
        const wallet = await prisma.wallet.findUnique({ where: { id } });
        if (!wallet || wallet.userId !== userId) {
            return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
        }

        const updated = await prisma.wallet.update({
            where: { id },
            data: {
                name: name ?? undefined,
                type: type ?? undefined,
                initialBalance: initialBalance !== undefined ? Number(initialBalance) : undefined,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating wallet:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
});
