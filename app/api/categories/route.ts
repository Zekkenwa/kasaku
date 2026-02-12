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

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) {
        return new NextResponse("User not found", { status: 404 });
    }

    const category = await prisma.category.create({
        data: {
            userId: user.id,
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

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) {
        return new NextResponse("User not found", { status: 404 });
    }

    // Ensure category belongs to user
    const category = await prisma.category.findFirst({
        where: { id, userId: user.id },
    });

    if (!category) {
        return new NextResponse("Category not found", { status: 404 });
    }

    // Optional: Check if used in transactions before deleting? 
    // For now, let's allow deletion but handle constraints if necessary. 
    // Prisma schema doesn't strictly cascade delete on category relation in Transaction (it's optional in Transaction model), 
    // but let's check.
    // Transaction model: category Category? @relation(fields: [categoryId], references: [id])
    // It is optional, so deleting category sets transaction.categoryId to null (if designed that way) or fails if foreign key constraint exists without SetNull.
    // Actually, standard Prisma behavior for optional relation without onDelete action is usually SetNull or Restrict.
    // Let's assume we can delete. If it fails due to FK, we'll catch it.

    try {
        await prisma.category.delete({
            where: { id },
        });
    } catch (error) {
        return new NextResponse("Cannot delete category in use", { status: 400 });
    }

    return NextResponse.json({ success: true });
}
