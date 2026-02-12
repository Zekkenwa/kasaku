import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AccountSettingsClient from "./AccountSettingsClient";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      name: true,
      email: true,
      phone: true,
      monthlyReportOptIn: true,
      deleteRequestedAt: true,
      deleteScheduledAt: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  return <AccountSettingsClient user={user} />;
}