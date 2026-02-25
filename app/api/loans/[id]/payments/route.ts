import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-handler";

export const POST = withAuth(async (
    request: Request,
    userId: string,
    props: { params: Promise<{ id: string }> }
) => {
    const params = await props.params;

    const { amount, note, date, loanType } = await request.json();
    const loanId = params.id;

    try {
        // Create payment record
        const payment = await prisma.paymentHistory.create({
            data: {
                loanId,
                amount: Number(amount),
                note,
                date: date ? new Date(date) : new Date(),
            },
        });

        // Auto-check if fully paid
        const loan = await prisma.loan.findUnique({
            where: { id: loanId },
            include: { payments: true }
        });

        if (loan) {
            const totalPaid = loan.payments.reduce((sum, p) => sum + p.amount, 0);
            if (totalPaid >= loan.amount) {
                await prisma.loan.update({
                    where: { id: loanId },
                    data: { status: "PAID" }
                });
            }
        }

        // Create matching transaction in cashflow
        // Paying hutang (PAYABLE) → money goes out → EXPENSE
        // Receiving piutang (RECEIVABLE) → money comes in → INCOME
        const resolvedType = loanType || loan?.type || "PAYABLE";
        const txType = resolvedType === "PAYABLE" ? "EXPENSE" : "INCOME";
        const categoryName = resolvedType === "PAYABLE" ? "Bayar Hutang" : "Terima Piutang";

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
                note: note || `${categoryName}: ${loan?.name || "Pembayaran"}`,
                createdAt: date ? new Date(date) : new Date(),
            },
        });

        return NextResponse.json(payment);
    } catch (error) {
        console.error("Error creating payment:", error);
        return NextResponse.json({ error: "Error creating payment" }, { status: 500 });
    }
});
