import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-handler";

export const PUT = withAuth(async (
    request: Request,
    userId: string,
    { params }: { params: Promise<{ id: string }> }
) => {
    const { id } = await params;
    const { name, amount, dueDate, status } = await request.json();

    const loan = await prisma.loan.findFirst({
        where: { id, userId },
    });

    if (!loan) {
        return new NextResponse("Loan not found", { status: 404 });
    }

    const updated = await prisma.loan.update({
        where: { id },
        data: {
            name,
            amount: Number(amount),
            dueDate: dueDate ? new Date(dueDate) : new Date("2099-12-31"),
            status,
        },
    });

    return NextResponse.json(updated);
});

export const DELETE = withAuth(async (
    request: Request,
    userId: string,
    { params }: { params: Promise<{ id: string }> }
) => {
    const { id } = await params;

    const loan = await prisma.loan.findFirst({
        where: { id, userId },
    });

    if (!loan) {
        return new NextResponse("Loan not found", { status: 404 });
    }

    await prisma.loan.delete({
        where: { id },
    });

    return NextResponse.json({ success: true });
});
