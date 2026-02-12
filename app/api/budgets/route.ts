import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) {
        return new NextResponse("User not found", { status: 404 });
    }

    const budgets = await prisma.budget.findMany({
        where: { userId: user.id },
        include: { category: true },
    });

    return NextResponse.json(budgets);
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) {
        return new NextResponse("User not found", { status: 404 });
    }

    try {
        const json = await request.json();
        const { categoryId, limitAmount, period, startDate, endDate, dayOfWeek, dayOfMonth, monthOfYear } = json;

        if (!categoryId || !limitAmount) {
            return new NextResponse("Missing fields", { status: 400 });
        }

        const budget = await prisma.budget.upsert({
            where: {
                userId_categoryId: {
                    userId: user.id,
                    categoryId: categoryId,
                },
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
                userId: user.id,
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
}
