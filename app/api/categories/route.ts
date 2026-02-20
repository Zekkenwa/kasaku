import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { name, type } = await request.json();

    if (!name || !type) {
        return new NextResponse("Missing required fields", { status: 400 });
    }

    const userId = (session.user as any).id;

    if (!userId) {
        return new NextResponse("User not found in session", { status: 401 });
    }

    const category = await prisma.category.create({
        data: {
            userId: userId,
            name,
            type,
        },
    });

    return NextResponse.json(category);
}

export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
        return new NextResponse("Missing id", { status: 400 });
    }

    const userId = (session.user as any).id;

    if (!userId) {
        return new NextResponse("User not found in session", { status: 401 });
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
}
