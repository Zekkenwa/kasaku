import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-handler";

export const GET = withAuth(async (_req: Request, userId: string) => {
    const goals = await prisma.goal.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(goals);
});

export const POST = withAuth(async (req: Request, userId: string) => {
    try {
        const body = await req.json();
        const { name, targetAmount, currentAmount, notes, deadline } = body;

        if (!name || !targetAmount) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const goal = await prisma.goal.create({
            data: {
                userId,
                name,
                targetAmount: Number(targetAmount),
                currentAmount: Number(currentAmount) || 0,
                notes,
                deadline: deadline ? new Date(deadline) : null,
            },
        });

        return NextResponse.json(goal);
    } catch (error) {
        console.error("Error creating goal:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
});
