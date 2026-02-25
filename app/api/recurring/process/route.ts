import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-handler";

export const POST = withAuth(async (_req: Request, userId: string) => {
    try {
        const now = new Date();
        const dueTransactions = await prisma.recurringTransaction.findMany({
            where: {
                userId,
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
                const targetMonthDay = nextRun.getDate();
                nextRun.setMonth(nextRun.getMonth() + interval);
                // If the day changed, it means we rolled over (e.g. Jan 31 -> Mar 3)
                if (nextRun.getDate() !== targetMonthDay) {
                    nextRun.setDate(0); // Go back to the last day of the intended month
                }
            }

            // 2. Queue Transaction Creation
            operations.push(
                prisma.transaction.create({
                    data: {
                        userId,
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
});
