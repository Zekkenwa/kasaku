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
        const { limitAmount, period, startDate, endDate, dayOfWeek, dayOfMonth, monthOfYear } = body;

        const budget = await prisma.budget.update({
            where: { id: params.id },
            data: {
                limitAmount: Number(limitAmount),
                period: period || undefined,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                dayOfWeek: dayOfWeek !== undefined ? Number(dayOfWeek) : undefined,
                dayOfMonth: dayOfMonth !== undefined ? Number(dayOfMonth) : undefined,
                monthOfYear: monthOfYear !== undefined ? Number(monthOfYear) : undefined,
            },
        });

        return NextResponse.json(budget);
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
        await prisma.budget.delete({
            where: { id: params.id },
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Error deleting" }, { status: 500 });
    }
}
