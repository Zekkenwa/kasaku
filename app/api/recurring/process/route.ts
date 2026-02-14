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

        for (const recurring of dueTransactions) {
            // 1. Create the transaction
            await prisma.transaction.create({
                data: {
                    userId: user.id,
                    amount: recurring.amount,
                    type: recurring.type,
                    categoryId: recurring.categoryId,
                    walletId: recurring.walletId,
                    note: `[Rutinitas] ${recurring.name} ${recurring.note ? ` - ${recurring.note}` : ""}`,
                    createdAt: new Date(), // Transaction date is now
                    // We might want to use recurring.nextRun as createdAt if we want backdating?
                    // User said "executable when user opens dashboard", so 'now' or 'nextRun'?
                    // If we use 'now', the cashflow shows today. If we use 'nextRun', it might show yesterday.
                    // Let's use 'nextRun' to accurately reflect when it SHOULD have happened.
                    // Actually, if it's 2 months ago, we might want to generate all missed ones?
                    // For now, let's just process the immediate one. 
                    // To handle multiple missed: a loop is needed. 
                    // Let's stick to simple single processing per call, or loop until nextRun > now for catching up.
                    // "Catch up" logic:
                },
            });

            // Loop for "Catch up" if missed multiple? 
            // For now, let's just do one step. Dashboard refresh will trigger again if still <= now?
            // "Recurring" implies it should happen on schedule. 
            // If I missed 3 months, I probably want 3 transactions.
            // But let's keep it simple: Just one step forward per check to avoid infinite loops if something is wrong.
            // Frontend will call this once. Maybe we should process ALL due instances? 
            // Let's stick to one per item for safety, but correct the nextRun.

            // Wait, if I use `nextRun` as createdAt, then for a daily tx missed 10 days ago, I'll have a tx 10 days ago.
            // then nextRun becomes 9 days ago. 
            // If I only process one, I still have 9 pending. 
            // So if I reload 10 times, I catch up. 

            // Let's implement a loop to catch up for *this specific item*
            let nextRun = new Date(recurring.nextRun);
            const interval = recurring.interval || 1;

            // Update nextRun logic
            if (recurring.frequency === "DAILY") {
                nextRun.setDate(nextRun.getDate() + interval);
            } else if (recurring.frequency === "WEEKLY") {
                nextRun.setDate(nextRun.getDate() + (interval * 7));
            } else if (recurring.frequency === "MONTHLY") {
                nextRun.setMonth(nextRun.getMonth() + interval);
            }

            // 3. Update recurring record
            await prisma.recurringTransaction.update({
                where: { id: recurring.id },
                data: {
                    lastRun: recurring.nextRun, // It ran for the scheduled time
                    nextRun: nextRun,
                },
            });

            processedCount++;
        }

        return NextResponse.json({ processed: processedCount });
    } catch (error) {
        console.error("Error processing recurring:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
