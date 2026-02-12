import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) {
        return new NextResponse("User not found", { status: 404 });
    }

    // Auto-creation / Migration logic
    // 1. Check if user has any wallets
    const walletsCount = await prisma.wallet.count({
        where: { userId: user.id },
    });

    if (walletsCount === 0) {
        // 2. Create default "Tunai" wallet
        const defaultWallet = await prisma.wallet.create({
            data: {
                userId: user.id,
                name: "Tunai",
                type: "CASH",
                initialBalance: 0,
            },
        });

        // 3. Migrate existing transactions to this wallet
        await prisma.transaction.updateMany({
            where: {
                userId: user.id,
                walletId: null,
            },
            data: {
                walletId: defaultWallet.id,
            },
        });
    }

    const wallets = await prisma.wallet.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(wallets);
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) {
        return new NextResponse("User not found", { status: 404 });
    }

    try {
        const json = await request.json();
        const { name, type, initialBalance } = json;

        if (!name || !type) {
            return new NextResponse("Missing fields", { status: 400 });
        }

        const wallet = await prisma.wallet.create({
            data: {
                userId: user.id,
                name,
                type,
                initialBalance: Number(initialBalance) || 0,
            },
        });

        return NextResponse.json(wallet);
    } catch (error) {
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
