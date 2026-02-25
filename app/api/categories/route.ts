import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-handler";

export const POST = withAuth(async (request: Request, userId: string) => {
    const { name, type } = await request.json();

    if (!name || !type) {
        return new NextResponse("Missing required fields", { status: 400 });
    }

    const category = await prisma.category.create({
        data: {
            userId: userId,
            name,
            type,
        },
    });

    return NextResponse.json(category);
});

export const DELETE = withAuth(async (request: Request, userId: string) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
        return new NextResponse("Missing id", { status: 400 });
    }

    // Ensure category belongs to user
    const category = await prisma.category.findFirst({
        where: { id, userId: userId },
    });

    if (!category) {
        return new NextResponse("Category not found", { status: 404 });
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            // Check dependencies: Transactions, RecurringTransactions, Budgets within transaction
            const txCount = await tx.transaction.count({
                where: { userId: userId, categoryId: category.id }
            });

            const recurringCount = await tx.recurringTransaction.count({
                where: { userId: userId, categoryId: category.id }
            });

            // Loop constraints
            if (category.name === "Lainnya") {
                throw new Error("Cannot delete default category 'Lainnya'");
            }

            if (txCount > 0 || recurringCount > 0) {
                let otherCategory = await tx.category.findFirst({
                    where: {
                        userId: userId,
                        name: "Lainnya",
                        type: category.type
                    }
                });

                if (!otherCategory) {
                    otherCategory = await tx.category.create({
                        data: {
                            userId: userId,
                            name: "Lainnya",
                            type: category.type
                        }
                    });
                }

                // Move Transactions
                if (txCount > 0) {
                    await tx.transaction.updateMany({
                        where: { userId: userId, categoryId: category.id },
                        data: { categoryId: otherCategory.id }
                    });
                }

                // Move Recurring Transactions
                if (recurringCount > 0) {
                    await tx.recurringTransaction.updateMany({
                        where: { userId: userId, categoryId: category.id },
                        data: { categoryId: otherCategory.id }
                    });
                }
            }

            // Delete Budgets associated with this category
            await tx.budget.deleteMany({
                where: { userId: userId, categoryId: category.id }
            });

            // Finally delete the category
            await tx.category.delete({
                where: { id },
            });

            return { moved: txCount > 0 || recurringCount > 0 };
        });

        return NextResponse.json({ success: true, moved: result.moved });
    } catch (error: any) {
        console.error("Delete category error:", error);
        return new NextResponse(error.message || "Internal Error", { status: 500 });
    }
});
