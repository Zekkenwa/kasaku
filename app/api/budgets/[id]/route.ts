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
});

export const DELETE = withAuth(async (
    req: Request,
    _userId: string,
    props: { params: Promise<{ id: string }> }
) => {
    const params = await props.params;

    try {
        await prisma.budget.delete({
            where: { id: params.id },
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Error deleting" }, { status: 500 });
    }
});
