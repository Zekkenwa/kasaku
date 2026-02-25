import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-handler";

export const GET = withAuth(async (_request: Request, userId: string) => {
    // Auto-creation / Migration logic
    // 1. Check if user has any wallets
    const walletsCount = await prisma.wallet.count({
        where: { userId },
    });

    if (walletsCount === 0) {
        // 2. Create default "Tunai" wallet
        const defaultWallet = await prisma.wallet.create({
            data: {
                userId,
                name: "Tunai",
                type: "CASH",
                initialBalance: 0,
            },
        });

        // 3. Migrate existing transactions to this wallet
        await prisma.transaction.updateMany({
            where: {
                userId,
                walletId: null,
            },
            data: {
                walletId: defaultWallet.id,
            },
        });
    }

    const wallets = await prisma.wallet.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(wallets);
});

export const POST = withAuth(async (request: Request, userId: string) => {
    try {
        const json = await request.json();
        const { name, type, initialBalance } = json;

        if (!name || !type) {
            return new NextResponse("Missing fields", { status: 400 });
        }

        const wallet = await prisma.wallet.create({
            data: {
                userId,
                name,
                type,
                initialBalance: Number(initialBalance) || 0,
            },
        });

        return NextResponse.json(wallet);
    } catch (error) {
        return new NextResponse("Internal Server Error", { status: 500 });
    }
});
