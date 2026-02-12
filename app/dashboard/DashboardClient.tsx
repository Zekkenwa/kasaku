"use client";

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
} from "chart.js";
import { Pie, Line } from "react-chartjs-2";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AccountMenu from "./AccountMenu";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement
);

type TransactionType = "INCOME" | "EXPENSE";

type Transaction = {
  id: string;
  type: TransactionType;
  category: string;
  amount: number;
  note?: string;
  date: string;
};

type Loan = {
  id: string;
  name: string;
  amount: number;
  remaining: number;
  createdAt: string;
  dueDate: string;
  status: "ONGOING" | "PAID";
};

type Props = {
  userName: string;
  categories: string[];
  transactions: Transaction[];
  totals: {
    balance: number;
    totalIncome: number;
    totalExpense: number;
  };
  charts: {
    labels: string[];
    incomeLine: number[];
    expenseLine: number[];
    incomeByCategory: number[];
    expenseByCategory: number[];
  };
  loans: Loan[];
  monthOptions: number[];
  yearOptions: number[];
  selectedMonth: number;
  selectedYear: number;
};

const currency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const monthLabel = (month: number) =>
  new Intl.DateTimeFormat("id-ID", { month: "long" }).format(
    new Date(2020, month - 1, 1)
  );

export default function DashboardClient({
  userName,
  categories,
  transactions,
  totals,
  charts,
  loans,
  monthOptions,
  yearOptions,
  selectedMonth,
  selectedYear,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [typeFilter, setTypeFilter] = useState<"ALL" | TransactionType>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const typeOk = typeFilter === "ALL" || t.type === typeFilter;
      const categoryOk = categoryFilter === "ALL" || t.category === categoryFilter;
      return typeOk && categoryOk;
    });
  }, [typeFilter, categoryFilter, transactions]);

  const updateMonthYear = (month: number, year: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", String(month));
    params.set("year", String(year));
    router.push(`/dashboard?${params.toString()}`);
  };

  return (
    <main className="p-6 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Selamat datang</p>
          <h1 className="text-2xl font-semibold">{userName}</h1>
        </div>
        <AccountMenu />
      </header>

      <section className="flex flex-wrap gap-3">
        <select
          className="border rounded px-2 py-1"
          value={selectedMonth}
          onChange={(e) => updateMonthYear(Number(e.target.value), selectedYear)}
        >
          {monthOptions.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>

        <select
          className="border rounded px-2 py-1"
          value={selectedYear}
          onChange={(e) => updateMonthYear(selectedMonth, Number(e.target.value))}
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border">
          <p className="text-sm text-gray-500">Balance Now</p>
          <h2 className="text-xl font-semibold">{currency(totals.balance)}</h2>
        </div>
        <div className="p-4 rounded-xl border">
          <p className="text-sm text-gray-500">Total Income This Month</p>
          <h2 className="text-xl font-semibold">{currency(totals.totalIncome)}</h2>
        </div>
        <div className="p-4 rounded-xl border">
          <p className="text-sm text-gray-500">Total Spending This Month</p>
          <h2 className="text-xl font-semibold">{currency(totals.totalExpense)}</h2>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 border rounded-xl">
          <h3 className="font-medium mb-3">Spending by Category</h3>
          <Pie
            data={{
              labels: categories,
              datasets: [
                {
                  data: charts.expenseByCategory,
                  backgroundColor: ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"],
                },
              ],
            }}
          />
        </div>
        <div className="p-4 border rounded-xl">
          <h3 className="font-medium mb-3">Income by Category</h3>
          <Pie
            data={{
              labels: categories,
              datasets: [
                {
                  data: charts.incomeByCategory,
                  backgroundColor: ["#3b82f6", "#0ea5e9", "#6366f1", "#8b5cf6", "#14b8a6"],
                },
              ],
            }}
          />
        </div>
      </section>

      <section className="p-4 border rounded-xl">
        <div className="flex flex-wrap gap-3 mb-4">
          <select
            className="border rounded px-2 py-1"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as "ALL" | TransactionType)}
          >
            <option value="ALL">Semua Tipe</option>
            <option value="INCOME">Masuk</option>
            <option value="EXPENSE">Keluar</option>
          </select>

          <select
            className="border rounded px-2 py-1"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">Semua Kategori</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          {filteredTransactions.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between border-b pb-2"
            >
              <div>
                <p className="font-medium">{t.category}</p>
                <p className="text-xs text-gray-500">{t.date}</p>
              </div>
              <p
                className={`font-semibold ${
                  t.type === "INCOME" ? "text-green-600" : "text-red-600"
                }`}
              >
                {t.type === "INCOME" ? "+" : "-"} {currency(t.amount)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="p-4 border rounded-xl">
        <h3 className="font-medium mb-3">Spending vs Income</h3>
        <Line
          data={{
            labels: charts.labels,
            datasets: [
              {
                label: "Income",
                data: charts.incomeLine,
                borderColor: "#22c55e",
                backgroundColor: "rgba(34,197,94,0.2)",
              },
              {
                label: "Spending",
                data: charts.expenseLine,
                borderColor: "#ef4444",
                backgroundColor: "rgba(239,68,68,0.2)",
              },
            ],
          }}
        />
      </section>

      <section className="p-4 border rounded-xl">
        <h3 className="font-medium mb-3">Daftar Hutang</h3>
        <div className="space-y-2">
          {loans.map((l) => (
            <div key={l.id} className="border-b pb-2">
              <p className="font-medium">{l.name}</p>
              <p className="text-xs text-gray-500">
                Input: {l.createdAt} • Jatuh Tempo: {l.dueDate}
              </p>
              <p className="text-sm">
                Sisa Hutang: <span className="font-semibold">{currency(l.remaining)}</span>
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}