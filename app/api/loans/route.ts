import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { name, amount, dueDate, type, isNew } = await request.json();

    if (!name || !amount) {
        return new NextResponse("Missing required fields", { status: 400 });
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) {
        return new NextResponse("User not found", { status: 404 });
    }

    try {
        // Create the loan
        const loan = await (prisma.loan as any).create({
            data: {
                userId: user.id,
                name,
                amount: Number(amount),
                dueDate: dueDate ? new Date(dueDate) : new Date("2099-12-31"),
                status: "ONGOING",
                type: type || "PAYABLE",
            },
        });

        // If it's a NEW loan, create a matching transaction
        if (isNew) {
            // Find or create a "Hutang" or "Piutang" category
            const categoryName = type === "RECEIVABLE" ? "Piutang" : "Hutang";
            const txType = type === "RECEIVABLE" ? "EXPENSE" : "INCOME";
            // PAYABLE (hutang baru) = you received money → INCOME
            // RECEIVABLE (piutang baru) = you lent money → EXPENSE

            let category = await prisma.category.findFirst({
                where: { userId: user.id, name: categoryName },
            });

            if (!category) {
                category = await prisma.category.create({
                    data: {
                        userId: user.id,
                        name: categoryName,
                        type: txType,
                    },
                });
            }

            await prisma.transaction.create({
                data: {
                    userId: user.id,
                    type: txType,
                    amount: Number(amount),
                    categoryId: category.id,
                    note: `${categoryName}: ${name}`,
                    createdAt: new Date(),
                },
            });
        }

        return NextResponse.json(loan);
    } catch (error) {
        console.error("Error creating loan:", error);
        return NextResponse.json({ error: "Error creating loan" }, { status: 500 });
    }
}
