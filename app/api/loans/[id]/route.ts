import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;
    const { name, amount, dueDate, status } = await request.json();

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) {
        return new NextResponse("User not found", { status: 404 });
    }

    const loan = await prisma.loan.findFirst({
        where: { id, userId: user.id },
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
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) {
        return new NextResponse("User not found", { status: 404 });
    }

    const loan = await prisma.loan.findFirst({
        where: { id, userId: user.id },
    });

    if (!loan) {
        return new NextResponse("Loan not found", { status: 404 });
    }

    await prisma.loan.delete({
        where: { id },
    });

    return NextResponse.json({ success: true });
}
