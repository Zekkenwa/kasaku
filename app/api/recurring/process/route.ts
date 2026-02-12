import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const now = new Date();

    // Find all due items
    const dueItems = await prisma.recurringTransaction.findMany({
        where: {
            userId: user.id,
            nextRun: { lte: now },
        },
    });

    if (dueItems.length === 0) {
        return NextResponse.json({ processed: 0 });
    }

    let processedCount = 0;

    for (const item of dueItems) {
        // 1. Create Transaction
        await prisma.transaction.create({
            data: {
                userId: user.id,
                amount: item.amount,
                type: item.type,
                categoryId: item.categoryId,
                walletId: item.walletId,
                note: `[Auto] ${item.name}${item.note ? ' - ' + item.note : ''}`,
                createdAt: item.nextRun, // Use the scheduled date, not 'now' to match expectation
            },
        });

        // 2. Calculate next run
        const nextDate = new Date(item.nextRun);
        const interval = item.interval || 1;

        if (item.frequency === "DAILY") {
            nextDate.setDate(nextDate.getDate() + interval);
        } else if (item.frequency === "WEEKLY") {
            nextDate.setDate(nextDate.getDate() + (7 * interval));
        } else if (item.frequency === "MONTHLY") {
            nextDate.setMonth(nextDate.getMonth() + interval);
        }

        // 3. Update Recurring Item
        await prisma.recurringTransaction.update({
            where: { id: item.id },
            data: {
                lastRun: item.nextRun,
                nextRun: nextDate,
            },
        });

        processedCount++;
    }

    return NextResponse.json({ processed: processedCount });
}
