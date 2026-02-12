import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DashboardClient from "./DashboardClient";

type SearchParams = {
  month?: string;
  year?: string;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true },
  });

  if (!user) {
    redirect("/login");
  }

  const now = new Date();
  const selectedMonth = Number(searchParams.month) || now.getMonth() + 1;
  const selectedYear = Number(searchParams.year) || now.getFullYear();

  const monthStart = new Date(selectedYear, selectedMonth - 1, 1);
  const monthEnd = new Date(selectedYear, selectedMonth, 1);
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

  const [minTx, maxTx] = await Promise.all([
    prisma.transaction.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.transaction.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  const startYear = minTx?.createdAt.getFullYear() ?? now.getFullYear();
  const endYear = maxTx?.createdAt.getFullYear() ?? now.getFullYear();
  const yearOptions = Array.from(
    { length: endYear - startYear + 1 },
    (_, i) => startYear + i
  );

  const [categories, transactionsRaw, loansRaw] = await Promise.all([
    prisma.category.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      select: { name: true },
    }),
    prisma.transaction.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: monthStart, lt: monthEnd },
      },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.loan.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const categoryNames = categories.map((c) => c.name);
  const uncategorizedName = "Tanpa Kategori";

  const transactions = transactionsRaw.map((t) => ({
    id: t.id,
    type: t.type,
    category: t.category?.name ?? uncategorizedName,
    amount: t.amount,
    note: t.note ?? undefined,
    date: t.createdAt.toISOString().slice(0, 10),
  }));

  const hasUncategorized = transactions.some((t) => t.category === uncategorizedName);
  const categoriesForFilter = hasUncategorized
    ? [...categoryNames, uncategorizedName]
    : categoryNames;

  const totalIncome = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  const incomeByCategory = categoriesForFilter.map((cat) =>
    transactions
      .filter((t) => t.type === "INCOME" && t.category === cat)
      .reduce((sum, t) => sum + t.amount, 0)
  );

  const expenseByCategory = categoriesForFilter.map((cat) =>
    transactions
      .filter((t) => t.type === "EXPENSE" && t.category === cat)
      .reduce((sum, t) => sum + t.amount, 0)
  );

  const labels = Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`);
  const incomeLine = Array(daysInMonth).fill(0);
  const expenseLine = Array(daysInMonth).fill(0);

  transactionsRaw.forEach((t) => {
    const dayIndex = t.createdAt.getDate() - 1;
    if (t.type === "INCOME") incomeLine[dayIndex] += t.amount;
    if (t.type === "EXPENSE") expenseLine[dayIndex] += t.amount;
  });

  const loans = loansRaw.map((l) => ({
    id: l.id,
    name: l.name,
    amount: l.amount,
    remaining: l.amount,
    createdAt: l.createdAt.toISOString().slice(0, 10),
    dueDate: l.dueDate.toISOString().slice(0, 10),
    status: l.status,
  }));

  return (
    <DashboardClient
      userName={user.name ?? "User"}
      categories={categoriesForFilter}
      transactions={transactions}
      totals={{
        balance,
        totalIncome,
        totalExpense,
      }}
      charts={{
        labels,
        incomeLine,
        expenseLine,
        incomeByCategory,
        expenseByCategory,
      }}
      loans={loans}
      monthOptions={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}
      yearOptions={yearOptions}
      selectedMonth={selectedMonth}
      selectedYear={selectedYear}
    />
  );
}