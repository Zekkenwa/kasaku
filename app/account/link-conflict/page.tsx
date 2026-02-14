
import { redirect } from "next/navigation";
import { decode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import ConflictResolverClient from "./ConflictResolverClient";

async function getStats(userId: string) {
    const [walletCount, transactionCount, lastTransaction, income, expense] = await Promise.all([
        prisma.wallet.count({ where: { userId } }),
        prisma.transaction.count({ where: { wallet: { userId } } }),
        prisma.transaction.findFirst({
            where: { wallet: { userId } },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true }
        }),
        prisma.transaction.aggregate({
            _sum: { amount: true },
            where: { userId, type: "INCOME" }
        }),
        prisma.transaction.aggregate({
            _sum: { amount: true },
            where: { userId, type: "EXPENSE" }
        })
    ]);

    const totalBalance = (income._sum.amount || 0) - (expense._sum.amount || 0);

    return { walletCount, transactionCount, lastTx: lastTransaction?.createdAt, totalBalance };
}

export default async function LinkConflictPage({ searchParams }: { searchParams: { token?: string } }) {
    const tokenStr = searchParams.token;
    if (!tokenStr) redirect("/account");

    let payload;
    try {
        payload = await decode({ token: tokenStr, secret: process.env.NEXTAUTH_SECRET || "secret" });
    } catch (e) {
        redirect("/account?error=InvalidToken");
    }

    if (!payload || !payload.targetUserId || !payload.conflictUserId) redirect("/account?error=InvalidTokenParams");

    const [currentInfo, googleInfo] = await Promise.all([
        prisma.user.findUnique({ where: { id: payload.targetUserId as string } }),
        prisma.user.findUnique({ where: { id: payload.conflictUserId as string } })
    ]);

    if (!currentInfo || !googleInfo) redirect("/account?error=UserNotFound");

    const [currentStats, googleStats] = await Promise.all([
        getStats(currentInfo.id),
        getStats(googleInfo.id)
    ]);

    return (
        <ConflictResolverClient
            token={tokenStr}
            currentUser={{ ...currentInfo, ...currentStats }}
            googleUser={{ ...googleInfo, ...googleStats }}
            googleEmail={payload.googleEmail as string}
        />
    );
}
