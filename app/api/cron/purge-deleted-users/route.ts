import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    await prisma.$transaction([
      prisma.transaction.deleteMany({ where: { userId: user.id } }),
      prisma.loan.deleteMany({ where: { userId: user.id } }),
      prisma.category.deleteMany({ where: { userId: user.id } }),
      prisma.session.deleteMany({ where: { userId: user.id } }),
      prisma.account.deleteMany({ where: { userId: user.id } }),
      prisma.user.delete({ where: { id: user.id } }),
    ]);
  }

  return NextResponse.json({ deletedUsers: users.length });
}