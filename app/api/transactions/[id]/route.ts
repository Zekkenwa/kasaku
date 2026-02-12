import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    if (!id) {
        return new NextResponse("Missing id", { status: 400 });
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) {
        return new NextResponse("User not found", { status: 404 });
    }

    // Ensure transaction belongs to user
    const transaction = await prisma.transaction.findFirst({
        where: { id, userId: user.id },
    });

    if (!transaction) {
        return new NextResponse("Transaction not found", { status: 404 });
    }

    await prisma.transaction.delete({
        where: { id },
    });

    return NextResponse.json({ success: true });
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;
    const { amount, type, categoryId, note, date } = await request.json();

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) {
        return new NextResponse("User not found", { status: 404 });
    }

    const transaction = await prisma.transaction.findFirst({
        where: { id, userId: user.id },
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
}
