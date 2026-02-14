import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.recurringTransaction.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    try {
        const body = await req.json();
        const { name, amount, type, categoryId, walletId, frequency, interval, startDate, note } = body;

        const data: any = {
            name,
            amount: Number(amount),
            type,
            categoryId,
            walletId: walletId || null,
            frequency,
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
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { id } = await params;
    const existing = await prisma.recurringTransaction.findUnique({ where: { id } });

    if (!existing || existing.userId !== user.id) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.recurringTransaction.delete({ where: { id } });

    return NextResponse.json({ success: true });
}
