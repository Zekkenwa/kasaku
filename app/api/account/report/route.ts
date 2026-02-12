import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const escapeCsv = (value: string) => {
  const cleaned = value.replace(/"/g, '""');
  return `"${cleaned}"`;
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const txs = await prisma.transaction.findMany({
    where: { userId: user.id },
    include: { category: true },
    orderBy: { createdAt: "asc" },
  });

  const header = ["Date", "Type", "Category", "Amount", "Note"].join(",");
  const lines = txs.map((t) => {
    const row = [
      t.createdAt.toISOString().slice(0, 10),
      t.type,
      t.category?.name ?? "",
      String(t.amount),
      t.note ?? "",
    ].map(escapeCsv);
    return row.join(",");
  });

  const csv = [header, ...lines].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=kasaku-report.csv",
    },
  });
}