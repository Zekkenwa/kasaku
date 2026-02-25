import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-handler";

export const POST = withAuth(async (request: Request, userId: string) => {
    const { name, amount, dueDate, type, isNew } = await request.json();

    if (!name || !amount) {
        return new NextResponse("Missing required fields", { status: 400 });
    }

    try {
        // Create the loan
        const loan = await prisma.loan.create({
            data: {
                userId,
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
                where: { userId, name: categoryName },
            });

            if (!category) {
                category = await prisma.category.create({
                    data: {
                        userId,
                        name: categoryName,
                        type: txType,
                    },
                });
            }

            await prisma.transaction.create({
                data: {
                    userId,
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
});
