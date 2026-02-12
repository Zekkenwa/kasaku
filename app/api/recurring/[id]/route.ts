import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RecurringFrequency, TransactionType } from "@prisma/client";

export async function PUT(
    req: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        const { name, amount, type, categoryId, walletId, frequency, interval, startDate, note } = body;

        const recurring = await prisma.recurringTransaction.update({
            where: { id: params.id },
            data: {
                name,
                amount: Number(amount),
                type: type as TransactionType,
                categoryId,
                walletId,
                note,
                frequency: frequency as RecurringFrequency,
                interval: Number(interval),
                startDate: new Date(startDate),
                // Note: We might want to reset nextRun if startDate changes, but for now let's keep it simple
                // or user can manually edit it if we expose it. 
                // For simplicity: If editing, maybe we should re-calculate nextRun based on new start date ONLY if it's in the future?
                // Let's stick to simple field updates for now.
            },
        });

        return NextResponse.json(recurring);
    } catch (error) {
        return NextResponse.json({ error: "Error updating" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        await prisma.recurringTransaction.delete({
            where: { id: params.id },
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Error deleting" }, { status: 500 });
    }
}
