import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-handler";
import { Prisma, RecurringFrequency, TransactionType } from "@prisma/client";

export const PUT = withAuth(async (req: Request, userId: string, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    // Verify ownership
    const existing = await prisma.recurringTransaction.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    try {
        const body = await req.json();
        const { name, amount, type, categoryId, walletId, frequency, interval, startDate, note } = body;

        const data: Prisma.RecurringTransactionUncheckedUpdateInput = {
            name,
            amount: Number(amount),
            type: type as TransactionType,
            categoryId,
            walletId: walletId || null,
            frequency: frequency as RecurringFrequency,
            interval: Number(interval) || 1,
            note,
        };

        if (startDate) {
            data.startDate = new Date(startDate);
            // Only update nextRun if startDate implies a reset or logic change
            // For editing, usually we stick to nextRun unless startDate is explicitly moved?
            // User might be correcting a past mistake.
            // Let's reset nextRun to startDate to be safe/predictable on edit.
            data.nextRun = new Date(startDate);
        }

        const updated = await prisma.recurringTransaction.update({
            where: { id },
            data,
        });

        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
});

export const DELETE = withAuth(async (req: Request, userId: string, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const existing = await prisma.recurringTransaction.findUnique({ where: { id } });

    if (!existing || existing.userId !== userId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.recurringTransaction.delete({ where: { id } });

    return NextResponse.json({ success: true });
});
