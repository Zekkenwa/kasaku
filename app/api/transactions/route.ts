import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-handler";

export const POST = withAuth(async (request: Request, userId: string) => {
    const { amount, type, categoryId, note, date, walletId } = await request.json();

    if (!amount || !type || !categoryId || !date || !walletId) {
        return new NextResponse("Missing required fields", { status: 400 });
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

    // Fire-and-forget: process gamification in background, don't block the response
    import('@/lib/gamification')
        .then(({ processGamificationTick }) => processGamificationTick(userId))
        .catch((e) => console.error("Gamification error on Web transaction:", e));

    return NextResponse.json({ transaction });
});
