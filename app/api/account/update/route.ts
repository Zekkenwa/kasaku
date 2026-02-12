import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const data: Record<string, unknown> = {};

  if (typeof body.name === "string") {
    const value = body.name.trim();
    data.name = value.length ? value : null;
  }

  if (typeof body.phone === "string") {
    const value = body.phone.trim();
    if (value && !/^\d{8,15}$/.test(value)) {
      return NextResponse.json(
        { error: "Nomor harus angka dan tanpa simbol + (contoh: 628123456789)" },
        { status: 400 }
      );
    }
    data.phone = value.length ? value : null;
  }

  if (typeof body.monthlyReportOptIn === "boolean") {
    data.monthlyReportOptIn = body.monthlyReportOptIn;
  }

  await prisma.user.update({
    where: { email: session.user.email },
    data,
  });

  return NextResponse.json({ ok: true });
}