import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DashboardClient from "./DashboardClient";

type SearchParams = {
  month?: string;
  year?: string;
  start?: string;
  end?: string;
};

export default async function DashboardPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const searchParams = await props.searchParams;
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

  const startParam = searchParams.start;
  const endParam = searchParams.end;

  let filterStart: Date;
  let filterEnd: Date;
  let selectedMonth = Number(searchParams.month) || now.getMonth() + 1;
  let selectedYear = Number(searchParams.year) || now.getFullYear();

  if (startParam && endParam) {
    filterStart = new Date(startParam);
    filterEnd = new Date(endParam);
    filterEnd.setHours(23, 59, 59, 999);

    if (filterStart.getMonth() === filterEnd.getMonth() && filterStart.getFullYear() === filterEnd.getFullYear()) {
      selectedMonth = filterStart.getMonth() + 1;
      selectedYear = filterStart.getFullYear();
    }
  } else {
    filterStart = new Date(selectedYear, selectedMonth - 1, 1);
    filterEnd = new Date(selectedYear, selectedMonth, 0);
    filterEnd.setHours(23, 59, 59, 999);
  }

  const daysInRange = Math.ceil((filterEnd.getTime() - filterStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

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

  const [categories, transactionsRaw, loansRaw, budgets, wallets, goalsRaw] = await Promise.all([
    prisma.category.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true },
    }),
    prisma.transaction.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: filterStart, lte: filterEnd },
      },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.loan.findMany({
      where: { userId: user.id },
      include: { payments: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.budget.findMany({
      where: { userId: user.id },
      include: { category: true },
    }),
    prisma.wallet.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, type: true, initialBalance: true },
    }),
    prisma.goal.findMany({
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
    walletId: t.walletId ?? undefined,
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

  // Calculate lifetime balance using aggregation for better performance
  const [incomeAgg, expenseAgg] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId: user.id, type: "INCOME" },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId: user.id, type: "EXPENSE" },
      _sum: { amount: true },
    }),
  ]);

  const balance = (incomeAgg._sum.amount ?? 0) - (expenseAgg._sum.amount ?? 0);

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

  // Generate labels for the range (full date format)
  const labels = Array.from({ length: daysInRange }, (_, i) => {
    const d = new Date(filterStart);
    d.setDate(d.getDate() + i);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  });

  // Ensure daysInRange is valid (at least 1) to prevent RangeError
  const safeDaysInRange = Math.max(1, daysInRange);

  const incomeLine = Array(safeDaysInRange).fill(0);
  const expenseLine = Array(safeDaysInRange).fill(0);

  transactionsRaw.forEach((t) => {
    // Calculate index relative to filterStart
    const diffTime = Math.abs(t.createdAt.getTime() - filterStart.getTime());
    const dayIndex = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (dayIndex >= 0 && dayIndex < daysInRange) {
      if (t.type === "INCOME") incomeLine[dayIndex] += t.amount;
      if (t.type === "EXPENSE") expenseLine[dayIndex] += t.amount;
    }
  });

  const loans = loansRaw.map(loan => {
    const totalPaid = loan.payments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);
    return {
      ...loan,
      remaining: loan.amount - totalPaid,
      createdAt: loan.createdAt.toLocaleDateString("id-ID"),
      dueDate: loan.dueDate ? loan.dueDate.toISOString() : undefined,
      payments: loan.payments.map((p: { id: string; amount: number; date: Date; note: string | null }) => ({
        id: p.id,
        amount: p.amount,
        date: p.date.toLocaleDateString("id-ID"),
        note: p.note ?? undefined,
      })),
    };
  });

  const goals = goalsRaw.map(g => ({
    id: g.id,
    name: g.name,
    targetAmount: g.targetAmount,
    currentAmount: g.currentAmount,
    deadline: g.deadline?.toISOString(),
    notes: g.notes ?? undefined,
  }));

  return (
    <DashboardClient
      userName={user.name ?? "User"}
      categoryObjects={categories}
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
      budgets={budgets.map(b => ({
        id: b.id,
        categoryId: b.categoryId,
        categoryName: b.category.name,
        limitAmount: b.limitAmount,
        period: b.period,
      }))}
      wallets={wallets}
      monthOptions={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}
      yearOptions={yearOptions}
      selectedMonth={selectedMonth}
      selectedYear={selectedYear}
      goals={goals}
      dateRange={{
        start: filterStart.toISOString().split('T')[0],
        end: filterEnd.toISOString().split('T')[0]
      }}
      firstTxDate={minTx?.createdAt.toISOString().split('T')[0] ?? null}
    />
  );
}