import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-handler";

export const PUT = withAuth(async (
    req: Request,
    _userId: string,
    props: { params: Promise<{ id: string }> }
) => {
    const params = await props.params;

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
});

export const DELETE = withAuth(async (
    req: Request,
    _userId: string,
    props: { params: Promise<{ id: string }> }
) => {
    const params = await props.params;

    try {
        await prisma.goal.delete({
            where: { id: params.id },
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Error deleting" }, { status: 500 });
    }
});
