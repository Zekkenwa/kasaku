import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-handler";

export const GET = withAuth(async (_request: Request, userId: string) => {
    const budgets = await prisma.budget.findMany({
        where: { userId },
        include: { category: true },
    });

    return NextResponse.json(budgets);
});

export const POST = withAuth(async (request: Request, userId: string) => {
    try {
        const { categoryId, limitAmount, period, startDate, endDate, dayOfWeek, dayOfMonth, monthOfYear } = await request.json();

        if (!categoryId || !limitAmount) {
            return new NextResponse("Missing fields", { status: 400 });
        }
        // Upsert budget
        const budget = await prisma.budget.upsert({
            where: {
                userId_categoryId: {
                    userId: userId,
                    categoryId
                }
            },
            update: {
                limitAmount: Number(limitAmount),
                period: period || "MONTHLY",
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                dayOfWeek: dayOfWeek !== undefined && dayOfWeek !== null ? Number(dayOfWeek) : null,
                dayOfMonth: dayOfMonth !== undefined && dayOfMonth !== null ? Number(dayOfMonth) : null,
                monthOfYear: monthOfYear !== undefined && monthOfYear !== null ? Number(monthOfYear) : null,
            },
            create: {
                userId: userId,
                categoryId,
                limitAmount: Number(limitAmount),
                period: period || "MONTHLY",
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                dayOfWeek: dayOfWeek !== undefined && dayOfWeek !== null ? Number(dayOfWeek) : null,
                dayOfMonth: dayOfMonth !== undefined && dayOfMonth !== null ? Number(dayOfMonth) : null,
                monthOfYear: monthOfYear !== undefined && monthOfYear !== null ? Number(monthOfYear) : null,
            },
        });

        return NextResponse.json(budget);
    } catch (error) {
        return new NextResponse("Internal Server Error", { status: 500 });
    }
});
