import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const scheduled = new Date(now);
  scheduled.setDate(scheduled.getDate() + 3);

  await prisma.user.update({
    where: { email: session.user.email },
    data: {
      deleteRequestedAt: now,
      deleteScheduledAt: scheduled,
    },
  });

  return NextResponse.json({ deleteScheduledAt: scheduled.toISOString() });
}