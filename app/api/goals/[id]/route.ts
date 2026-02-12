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
        const { name, targetAmount, currentAmount, notes, deadline } = body;

        const goal = await prisma.goal.update({
            where: { id: params.id },
            data: {
                name,
                targetAmount: Number(targetAmount),
                currentAmount: Number(currentAmount),
                notes,
                deadline: deadline ? new Date(deadline) : null,
            },
        });

        return NextResponse.json(goal);
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
        await prisma.goal.delete({
            where: { id: params.id },
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Error deleting" }, { status: 500 });
    }
}
