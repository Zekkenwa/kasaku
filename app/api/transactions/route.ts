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
