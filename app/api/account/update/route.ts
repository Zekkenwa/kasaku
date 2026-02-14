import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";

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

  if (typeof body.email === "string") {
    const value = body.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 });
    }

    // Check uniqueness if changed
    if (value !== session.user.email) {
      const existing = await prisma.user.findUnique({ where: { email: value } });
      if (existing) {
        return NextResponse.json({ error: "Email sudah digunakan pengguna lain" }, { status: 400 });
      }

      // Verify Password if user has one
      const currentUser = await prisma.user.findUnique({ where: { email: session.user.email } });
      if (currentUser?.passwordHash) {
        if (!body.password) {
          return NextResponse.json({ error: "Password diperlukan untuk mengganti email" }, { status: 400 });
        }
        const isValid = await compare(body.password, currentUser.passwordHash);
        if (!isValid) {
          return NextResponse.json({ error: "Password salah" }, { status: 400 });
        }
      }

      data.email = value;
    }
  }

  await prisma.user.update({
    where: { email: session.user.email },
    data,
  });

  return NextResponse.json({ ok: true });
}