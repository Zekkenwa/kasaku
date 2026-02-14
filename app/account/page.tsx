import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AccountSettingsClient from "./AccountSettingsClient";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    console.log("AccountPage: No session email, redirecting to login");
    redirect("/login");
  }

  console.log("AccountPage: Fetching user", session.user.email);

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { accounts: true },
  });

  if (!user) {
    redirect("/login");
  }

  // Transform for client
  const userData = {
    name: user.name,
    email: user.email,
    phone: user.phone,
    image: user.image,
    monthlyReportOptIn: user.monthlyReportOptIn,
    deleteRequestedAt: user.deleteRequestedAt,
    deleteScheduledAt: user.deleteScheduledAt,
    hasPassword: !!user.passwordHash,
    isGoogleLinked: user.accounts.some(acc => acc.provider === "google"),
  };

  return <AccountSettingsClient user={userData} />;
}