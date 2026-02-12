import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RecurringFrequency, TransactionType } from "@prisma/client";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const recurring = await prisma.recurringTransaction.findMany({
        where: { userId: user.id },
        include: { category: true, wallet: true },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(recurring);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    try {
        const body = await req.json();
        const { name, amount, type, categoryId, walletId, frequency, interval, startDate, note } = body;

        // Validation
        if (!name || !amount || !type || !categoryId || !frequency || !startDate) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const start = new Date(startDate);

        // Initial nextRun is the start date
        const nextRun = start;

        const recurring = await prisma.recurringTransaction.create({
            data: {
                userId: user.id,
                name,
                amount: Number(amount),
                type: type as TransactionType,
                categoryId,
                walletId, // Optional
                note,
                frequency: frequency as RecurringFrequency,
                interval: Number(interval) || 1,
                startDate: start,
                nextRun: nextRun,
            },
        });

        return NextResponse.json(recurring);
    } catch (error) {
        console.error("Error creating recurring transaction:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
