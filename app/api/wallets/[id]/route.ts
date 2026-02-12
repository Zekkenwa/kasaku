import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
    req: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        const { name, type, initialBalance } = body;

        const data: Record<string, unknown> = {};
        if (name !== undefined) data.name = name;
        if (type !== undefined) data.type = type;
        if (initialBalance !== undefined) data.initialBalance = Number(initialBalance);

        const wallet = await prisma.wallet.update({
            where: { id: params.id },
            data,
        });

        return NextResponse.json(wallet);
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
        // Unlink transactions from this wallet first
        await prisma.transaction.updateMany({
            where: { walletId: params.id },
            data: { walletId: null },
        });
        await prisma.recurringTransaction.updateMany({
            where: { walletId: params.id },
            data: { walletId: null },
        });
        await prisma.wallet.delete({
            where: { id: params.id },
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Error deleting" }, { status: 500 });
    }
}
