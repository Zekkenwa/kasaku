import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    try {
        const now = new Date();
        const dueTransactions = await prisma.recurringTransaction.findMany({
            where: {
                userId: user.id,
                nextRun: { lte: now },
            },
        });

        let processedCount = 0;

        const operations = [];

        for (const recurring of dueTransactions) {
            // 1. Calculate next run date
            let nextRun = new Date(recurring.nextRun);
            const interval = recurring.interval || 1;

            if (recurring.frequency === "DAILY") {
                nextRun.setDate(nextRun.getDate() + interval);
            } else if (recurring.frequency === "WEEKLY") {
                nextRun.setDate(nextRun.getDate() + (interval * 7));
            } else if (recurring.frequency === "MONTHLY") {
                nextRun.setMonth(nextRun.getMonth() + interval);
            }

            // 2. Queue Transaction Creation
            operations.push(
                prisma.transaction.create({
                    data: {
                        userId: user.id,
                        amount: recurring.amount,
                        type: recurring.type,
                        categoryId: recurring.categoryId,
                        walletId: recurring.walletId,
                        note: `[Rutinitas] ${recurring.name} ${recurring.note ? ` - ${recurring.note}` : ""}`,
                        createdAt: new Date(),
                    },
                })
            );

            // 3. Queue Recurring Update
            operations.push(
                prisma.recurringTransaction.update({
                    where: { id: recurring.id },
                    data: {
                        lastRun: recurring.nextRun,
                        nextRun: nextRun,
                    },
                })
            );

            processedCount++;
        }

        if (operations.length > 0) {
            await prisma.$transaction(operations);
        }

        return NextResponse.json({ processed: processedCount });
    } catch (error) {
        console.error("Error processing recurring:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
