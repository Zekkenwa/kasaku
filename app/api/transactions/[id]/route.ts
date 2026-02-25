import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-handler";

export const DELETE = withAuth(async (
    request: Request,
    userId: string,
    { params }: { params: Promise<{ id: string }> }
) => {
    const { id } = await params;

    if (!id) {
        return new NextResponse("Missing id", { status: 400 });
    }

    // Ensure transaction belongs to user
    const transaction = await prisma.transaction.findFirst({
        where: { id, userId },
    });

    if (!transaction) {
        return new NextResponse("Transaction not found", { status: 404 });
    }

    await prisma.transaction.delete({
        where: { id },
    });

    return NextResponse.json({ success: true });
});

export const PUT = withAuth(async (
    request: Request,
    userId: string,
    { params }: { params: Promise<{ id: string }> }
) => {
    const { id } = await params;
    const { amount, type, categoryId, note, date } = await request.json();

    const transaction = await prisma.transaction.findFirst({
        where: { id, userId },
    });

    if (!transaction) {
        return new NextResponse("Transaction not found", { status: 404 });
    }

    const updated = await prisma.transaction.update({
        where: { id },
        data: {
            amount: Number(amount),
            type,
            categoryId,
            note,
            createdAt: new Date(date),
        },
    });

    return NextResponse.json(updated);
});
