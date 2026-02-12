import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const goals = await prisma.goal.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(goals);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    try {
        const body = await req.json();
        const { name, targetAmount, currentAmount, notes, deadline } = body;

        if (!name || !targetAmount) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const goal = await prisma.goal.create({
            data: {
                userId: user.id,
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
}
