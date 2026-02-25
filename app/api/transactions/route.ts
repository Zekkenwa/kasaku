import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { amount, type, categoryId, note, date, walletId } = await request.json();

    if (!amount || !type || !categoryId || !date || !walletId) {
        return new NextResponse("Missing required fields", { status: 400 });
    }

    const userId = (session.user as any).id;

    if (!userId) {
        return new NextResponse("User not found in session", { status: 401 });
    }

    // Balance validation for EXPENSE transactions
    // wallet.initialBalance is the actual current wallet balance as displayed on the dashboard
    if (type === "EXPENSE") {
        const wallet = await prisma.wallet.findFirst({ where: { id: walletId, userId } });
        if (wallet && Number(amount) > wallet.initialBalance) {
            return NextResponse.json(
                { error: `Saldo tidak mencukupi. Saldo ${wallet.name} saat ini: Rp ${wallet.initialBalance.toLocaleString("id-ID")}. Silakan isi ulang saldo atau ubah jumlah transaksi.` },
                { status: 400 }
            );
        }
    }

    const transaction = await prisma.transaction.create({
        data: {
            userId: userId,
            amount: Number(amount),
            type,
            categoryId,
            note,
            walletId,
            createdAt: new Date(date),
        },
    });

    let gamification = null;
    try {
        const { processGamificationTick } = await import('@/lib/gamification');
        gamification = await processGamificationTick(userId);
    } catch (e) {
        console.error("Gamification error on Web transaction:", e);
    }

    return NextResponse.json({ transaction, gamification });
}
