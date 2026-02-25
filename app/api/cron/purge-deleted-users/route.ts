import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Cron endpoint to permanently delete users whose 3-day grace period has expired.
 * Deletes ALL related data in a single atomic database transaction.
 *
 * Protected by CRON_SECRET query parameter.
 * Schedule: run daily via Vercel Cron or external scheduler.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(request.url);
  const secretParam = url.searchParams.get("secret");

  if (secret && secretParam !== secret) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const now = new Date();

  const users = await prisma.user.findMany({
    where: { deleteScheduledAt: { lte: now } },
    select: { id: true },
  });

  for (const user of users) {
    await (prisma as any).$transaction([
      // Financial data
      (prisma as any).transaction.deleteMany({ where: { userId: user.id } }),
      (prisma as any).budget.deleteMany({ where: { userId: user.id } }),
      (prisma as any).loan.deleteMany({ where: { userId: user.id } }),
      (prisma as any).wallet.deleteMany({ where: { userId: user.id } }),
      (prisma as any).category.deleteMany({ where: { userId: user.id } }),
      (prisma as any).goal.deleteMany({ where: { userId: user.id } }),
      (prisma as any).recurringTransaction.deleteMany({ where: { userId: user.id } }),

      // Gamification
      (prisma as any).badge.deleteMany({ where: { userId: user.id } }),
      (prisma as any).userEngagement.deleteMany({ where: { userId: user.id } }),

      // Bot & AI history
      (prisma as any).botActionHistory.deleteMany({ where: { userId: user.id } }),
      (prisma as any).pendingBotTransaction.deleteMany({ where: { userId: user.id } }),

      // Auth & security
      (prisma as any).session.deleteMany({ where: { userId: user.id } }),
      (prisma as any).account.deleteMany({ where: { userId: user.id } }),
      (prisma as any).otpRateLimit.deleteMany({ where: { userId: user.id } }),

      // Finally, the user record itself
      (prisma as any).user.delete({ where: { id: user.id } }),
    ]);
  }

  return NextResponse.json({ purgedUsers: users.length });
}