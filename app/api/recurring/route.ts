import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const items = await prisma.recurringTransaction.findMany({
        where: { userId: user.id },
        include: { category: true, wallet: true },
        orderBy: { nextRun: "asc" },
    });

    return NextResponse.json(items);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    try {
        const body = await req.json();
        const { name, amount, type, categoryId, walletId, frequency, interval, startDate, note } = body;

        if (!name || !amount || !categoryId || !frequency || !startDate) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Calculate initial nextRun
        // If startDate is in the future, nextRun = startDate
        // If startDate is today, nextRun = startDate (will run today)
        // If startDate is past, we should probably set nextRun to the next occurrence relative to now?
        // For simplicity, let's assume nextRun = startDate (user sets the start date).
        // If user sets a past date, the process job will catch it immediately.

        const nextRun = new Date(startDate);
        // Ensure it's not set to a time that might be skipped if we run hourly. 
        // We probably only care about DATE part for nextRun logic in process job.

        const item = await prisma.recurringTransaction.create({
            data: {
                userId: user.id,
                name,
                amount: Number(amount),
                type, // INCOME/EXPENSE
                categoryId,
                walletId: walletId || null,
                frequency, // DAILY/WEEKLY/MONTHLY
                interval: Number(interval) || 1,
                startDate: new Date(startDate),
                nextRun: nextRun,
                note,
            },
        });

        return NextResponse.json(item);
    } catch (error) {
        console.error("Error creating recurring:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
