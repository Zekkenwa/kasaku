"use client";

import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, PointElement, LineElement,
} from "chart.js";
import { Pie, Line } from "react-chartjs-2";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AccountMenu from "./AccountMenu";
import Modal from "@/components/Modal";
import TransactionForm from "@/components/TransactionForm";
import CategoryManager from "@/components/CategoryManager";
import LoanForm from "@/components/LoanForm";
import ImportModal from "@/components/ImportModal";
import BudgetForm from "@/components/BudgetForm";
import BudgetProgress from "@/components/BudgetProgress";
import GoalCreateForm from "@/components/GoalCreateForm";
import WalletDistributor from "@/components/WalletDistributor";
import DateRangePicker from "@/components/DateRangePicker";
import PaymentForm from "@/components/PaymentForm";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement);

type TransactionType = "INCOME" | "EXPENSE";
type Transaction = { id: string; type: TransactionType; category: string; amount: number; note?: string; date: string; walletId?: string };
type Loan = { id: string; name: string; amount: number; remaining: number; createdAt: string; dueDate: string; status: "ONGOING" | "PAID"; type: "PAYABLE" | "RECEIVABLE"; payments: { id: string; amount: number; date: string; note?: string }[] };
type Budget = { id: string; categoryId: string; categoryName: string; limitAmount: number; period?: string };
type Wallet = { id: string; name: string; type: "CASH" | "BANK" | "EWALLET"; initialBalance: number };
type Goal = { id: string; name: string; targetAmount: number; currentAmount: number; deadline?: string; notes?: string };

type Props = {
  userName: string;
  categories: string[];
  categoryObjects: { id: string; name: string; type: string }[];
  transactions: Transaction[];
  totals: { balance: number; totalIncome: number; totalExpense: number };
  charts: { labels: string[]; incomeLine: number[]; expenseLine: number[]; incomeByCategory: number[]; expenseByCategory: number[] };
  loans: Loan[];
  budgets: Budget[];
  wallets: Wallet[];
  goals: Goal[];
  monthOptions: number[];
  yearOptions: number[];
  selectedMonth: number;
  selectedYear: number;
  dateRange: { start: string; end: string };
};

const currency = (v: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);
const monthLabel = (m: number) => new Intl.DateTimeFormat("id-ID", { month: "long" }).format(new Date(2020, m - 1, 1));

const PIE_COLORS_EXPENSE = ["#F26076", "#FF9760", "#FFD150", "#458B73", "#6366f1", "#ec4899", "#14b8a6", "#f97316"];
const PIE_COLORS_INCOME = ["#458B73", "#3b82f6", "#0ea5e9", "#6366f1", "#8b5cf6", "#14b8a6", "#22c55e", "#FFD150"];

export default function DashboardClient({
  userName, categories, transactions, totals, charts, loans, budgets, wallets,
  monthOptions, yearOptions, selectedMonth, selectedYear, categoryObjects, goals, dateRange,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isGoalCreateOpen, setIsGoalCreateOpen] = useState(false);
  const [isWalletDistOpen, setIsWalletDistOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activeLoanForPayment, setActiveLoanForPayment] = useState<Loan | null>(null);
  const [loanTab, setLoanTab] = useState<"PAYABLE" | "RECEIVABLE">("PAYABLE");
  const [hideSaldo, setHideSaldo] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("kasaku_hide_saldo") === "true";
    }
    return false;
  });
  const toggleHideSaldo = () => {
    setHideSaldo(prev => {
      const next = !prev;
      localStorage.setItem("kasaku_hide_saldo", String(next));
      return next;
    });
  };
  const censor = (value: string) => hideSaldo ? "••••••••" : value;

  const [dateFilterMode, setDateFilterMode] = useState<"MONTHLY" | "CUSTOM">(searchParams.has("start") ? "CUSTOM" : "MONTHLY");
  const updateCustomRange = (start: string, end: string) => {
    const p = new URLSearchParams(searchParams.toString()); p.delete("month"); p.delete("year"); p.set("start", start); p.set("end", end);
    router.push(`/dashboard?${p.toString()}`);
  };

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [editingBudget, setEditingBudget] = useState<{ categoryId: string; limitAmount: number; id?: string; period?: string } | null>(null);
  const [typeFilter, setTypeFilter] = useState<"ALL" | TransactionType>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [goalInputAmounts, setGoalInputAmounts] = useState<Record<string, string>>({});

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const typeOk = typeFilter === "ALL" || t.type === typeFilter;
      const catOk = categoryFilter === "ALL" || t.category === categoryFilter;
      return typeOk && catOk;
    });
  }, [typeFilter, categoryFilter, transactions]);

  const spentByCategory = useMemo(() => {
    const m: Record<string, number> = {};
    transactions.forEach((t) => { if (t.type === "EXPENSE") m[t.category] = (m[t.category] || 0) + t.amount; });
    return m;
  }, [transactions]);

  const updateMonthYear = (month: number, year: number) => {
    const p = new URLSearchParams(searchParams.toString()); p.set("month", String(month)); p.set("year", String(year));
    router.push(`/dashboard?${p.toString()}`);
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm("Hapus transaksi ini?")) return;
    try { const r = await fetch(`/api/transactions/${id}`, { method: "DELETE" }); if (r.ok) router.refresh(); else alert("Gagal"); } catch { alert("Error"); }
  };
  const handleDeleteLoan = async (id: string) => {
    if (!confirm("Hapus hutang ini?")) return;
    try { const r = await fetch(`/api/loans/${id}`, { method: "DELETE" }); if (r.ok) router.refresh(); else alert("Gagal"); } catch { alert("Error"); }
  };
  const handleGoalAddMoney = async (g: Goal) => {
    const amt = Number(goalInputAmounts[g.id]); if (!amt || amt <= 0) return;
    try {
      const r = await fetch(`/api/goals/${g.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: g.name, targetAmount: g.targetAmount, currentAmount: g.currentAmount + amt, notes: g.notes, deadline: g.deadline }) });
      if (r.ok) { setGoalInputAmounts(p => ({ ...p, [g.id]: "" })); router.refresh(); } else alert("Gagal");
    } catch { alert("Error"); }
  };
  const handleGoalWithdrawMoney = async (g: Goal) => {
    const amt = Number(goalInputAmounts[g.id]); if (!amt || amt <= 0) return;
    try {
      const r = await fetch(`/api/goals/${g.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: g.name, targetAmount: g.targetAmount, currentAmount: Math.max(0, g.currentAmount - amt), notes: g.notes, deadline: g.deadline }) });
      if (r.ok) { setGoalInputAmounts(p => ({ ...p, [g.id]: "" })); router.refresh(); } else alert("Gagal");
    } catch { alert("Error"); }
  };
  const handleDeleteGoal = async (id: string) => {
    if (!confirm("Apakah kamu yakin ingin menghapus target ini?")) return;
    try { const r = await fetch(`/api/goals/${id}`, { method: "DELETE" }); if (r.ok) router.refresh(); else alert("Gagal"); } catch { alert("Error"); }
  };

  const payableLoans = loans.filter(l => l.type === "PAYABLE" || !l.type);
  const receivableLoans = loans.filter(l => l.type === "RECEIVABLE");

  // px = clamp(2rem, 8vw, 8rem) for 2x wider margins
  const sideMargin = "clamp(2rem, 8vw, 8rem)";

  return (
    <main className="min-h-screen" style={{ background: "#f8f9fb" }}>
      {/* ===== HEADER ===== */}
      <div className="pt-8 pb-14 rounded-b-3xl shadow-sm" style={{ background: "linear-gradient(135deg, #458B73 0%, #458B73 60%, #FFD150 100%)", paddingLeft: sideMargin, paddingRight: sideMargin }}>
        <header className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Kasaku" className="w-10 h-10 rounded-xl" />
            <div>
              <p className="text-sm text-white/70">Selamat datang</p>
              <h1 className="text-2xl font-bold text-white">{userName}</h1>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <button onClick={() => setIsCategoryModalOpen(true)} className="px-3 py-2 rounded-xl text-sm font-medium bg-white/20 text-white border border-white/30 hover:bg-white/30 backdrop-blur-sm cursor-pointer">📁 Kategori</button>
            <button onClick={() => setIsImportModalOpen(true)} className="px-3 py-2 rounded-xl text-sm font-medium bg-white/20 text-white border border-white/30 hover:bg-white/30 backdrop-blur-sm cursor-pointer">📥 Import</button>
            <AccountMenu />
          </div>
        </header>

        {/* ===== SALDO (left, wider) | PEMASUKAN + PENGELUARAN stacked (right) ===== */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SALDO CARD — left: title+amount, right: wallet breakdown */}
          <div className="p-7 rounded-2xl bg-white/95 backdrop-blur-sm shadow-lg card-hover flex items-stretch">
            {/* Left: icon + title + amount */}
            <div className="flex flex-col justify-center min-w-0 pr-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #458B73, #458B73dd)" }}>
                  <span className="text-white text-2xl">💰</span>
                </div>
                <p className="text-4xl font-extrabold text-gray-700">Saldo</p>
                <button onClick={toggleHideSaldo} className="ml-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer" title={hideSaldo ? "Tampilkan saldo" : "Sembunyikan saldo"}>
                  {hideSaldo ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
              <h2 className="text-5xl font-extrabold" style={{ color: "#458B73" }}>{censor(currency(totals.balance))}</h2>
            </div>
            {/* Right: wallet distribution */}
            <div className="pl-5 border-l border-gray-100 flex flex-col justify-center flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Pembagian</p>
              <div className="space-y-1.5">
                {wallets && wallets.length > 0 ? wallets.map(w => (
                  <div key={w.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: w.type === "CASH" ? "#458B73" : w.type === "BANK" ? "#3b82f6" : "#8b5cf6" }} />
                      <span className="text-xs text-gray-600 truncate">{w.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-800 whitespace-nowrap">{censor(currency(w.initialBalance))}</span>
                  </div>
                )) : (
                  <p className="text-[10px] text-gray-400 italic">Belum ada wallet</p>
                )}
              </div>
              <button onClick={() => setIsWalletDistOpen(true)}
                className="mt-2 w-full px-2 py-1.5 rounded-lg text-[10px] font-semibold cursor-pointer border border-dashed border-gray-300 text-gray-400 hover:border-[#458B73] hover:text-[#458B73] transition-colors">
                💼 Atur Saldo
              </button>
            </div>
          </div>
          {/* PEMASUKAN + PENGELUARAN stacked right */}
          <div className="flex flex-col gap-6">
            <div className="p-6 rounded-2xl bg-white/95 backdrop-blur-sm shadow-lg card-hover flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FFD150, #FF9760)" }}>
                  <span className="text-white text-xl">📈</span>
                </div>
                <p className="text-2xl font-extrabold text-gray-700">Pemasukan</p>
                <button onClick={toggleHideSaldo} className="ml-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer" title={hideSaldo ? "Tampilkan" : "Sembunyikan"}>
                  {hideSaldo ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
              <h2 className="text-3xl font-extrabold" style={{ color: "#FF9760" }}>{censor(currency(totals.totalIncome))}</h2>
            </div>
            <div className="p-6 rounded-2xl bg-white/95 backdrop-blur-sm shadow-lg card-hover flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #F26076, #F26076dd)" }}>
                  <span className="text-white text-xl">📉</span>
                </div>
                <p className="text-2xl font-extrabold text-gray-700">Pengeluaran</p>
                <button onClick={toggleHideSaldo} className="ml-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer" title={hideSaldo ? "Tampilkan" : "Sembunyikan"}>
                  {hideSaldo ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
              <h2 className="text-3xl font-extrabold" style={{ color: "#F26076" }}>{censor(currency(totals.totalExpense))}</h2>
            </div>
          </div>
        </section>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="py-16 space-y-16" style={{ paddingLeft: sideMargin, paddingRight: sideMargin }}>

        {/* Date Filter */}
        <section className="flex flex-wrap gap-3 items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button onClick={() => { setDateFilterMode("MONTHLY"); if (searchParams.has('start')) { updateMonthYear(new Date().getMonth() + 1, new Date().getFullYear()); } }}
              className={`px-3 py-1.5 text-sm rounded-md cursor-pointer ${dateFilterMode === "MONTHLY" ? "bg-white shadow text-black font-medium" : "text-gray-500 hover:text-gray-900"}`}>Bulanan</button>
            <button onClick={() => setDateFilterMode("CUSTOM")}
              className={`px-3 py-1.5 text-sm rounded-md cursor-pointer ${dateFilterMode === "CUSTOM" ? "bg-white shadow text-black font-medium" : "text-gray-500 hover:text-gray-900"}`}>Kustom</button>
          </div>
          {dateFilterMode === "MONTHLY" && (
            <>
              <select className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white" value={selectedMonth} onChange={(e) => updateMonthYear(Number(e.target.value), selectedYear)}>
                {monthOptions.map((m) => (<option key={m} value={m}>{monthLabel(m)}</option>))}
              </select>
              <select className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white" value={selectedYear} onChange={(e) => updateMonthYear(selectedMonth, Number(e.target.value))}>
                {yearOptions.map((y) => (<option key={y} value={y}>{y}</option>))}
              </select>
            </>
          )}
          {dateFilterMode === "CUSTOM" && <DateRangePicker startDate={dateRange.start} endDate={dateRange.end} onApply={updateCustomRange} />}
        </section>

        {/* ===== BUDGET (left) + TARGET TABUNGAN (right) ===== */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div className="p-8 rounded-2xl bg-white shadow-sm border border-gray-100">
            <h3 className="font-extrabold text-xl mb-4">📊 Budget Status</h3>
            <button onClick={() => { setEditingBudget(null); setIsBudgetModalOpen(true); }}
              className="text-sm px-5 py-2.5 rounded-xl font-medium mb-6 cursor-pointer border-2 border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700">
              + Tambah Budget
            </button>
            <div className="grid grid-cols-1 gap-4">
              {budgets.map((b) => (
                <BudgetProgress key={b.id} id={b.id} categoryName={b.categoryName} limit={b.limitAmount} spent={spentByCategory[b.categoryName] || 0} period={b.period}
                  onEdit={() => { setEditingBudget({ categoryId: b.categoryId, limitAmount: b.limitAmount, id: b.id, period: b.period }); setIsBudgetModalOpen(true); }} />
              ))}
              {budgets.length === 0 && <p className="text-gray-400 italic text-sm">Belum ada budget yang diatur.</p>}
            </div>
          </div>

          <div className="p-8 rounded-2xl bg-white shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-extrabold text-xl">🎯 Target Tabungan</h3>
              <button onClick={() => setIsGoalCreateOpen(true)}
                className="text-sm px-5 py-2.5 rounded-xl font-medium cursor-pointer border-2 border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700">
                + Buat Target
              </button>
            </div>
            {goals.length === 0 ? (
              <p className="text-gray-400 italic text-sm text-center py-10">Belum ada target. Klik &quot;Buat Target&quot; untuk menambahkan.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {goals.map(g => {
                  const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
                  return (
                    <div key={g.id} className="p-4 rounded-xl border border-gray-100 hover:shadow-md card-hover relative">
                      <button onClick={() => handleDeleteGoal(g.id)} className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 cursor-pointer text-sm" title="Hapus">✕</button>
                      <div className="flex items-center justify-between mb-2 pr-8">
                        <p className="font-bold text-sm text-gray-800">{g.name}</p>
                        <span className="text-xs font-bold" style={{ color: pct >= 100 ? "#458B73" : "#FF9760" }}>{pct}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2">
                        <div className="h-2.5 rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 100 ? "#458B73" : "linear-gradient(90deg, #FFD150, #FF9760)" }} />
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 mb-3">
                        <span>{currency(g.currentAmount)}</span><span>{currency(g.targetAmount)}</span>
                      </div>
                      {g.deadline && <p className="text-[10px] text-gray-400 mb-3">Deadline: {new Date(g.deadline).toLocaleDateString("id-ID")}</p>}
                      <div className="flex gap-2 items-center">
                        <input type="number" placeholder="Jumlah..." value={goalInputAmounts[g.id] || ""} onChange={(e) => setGoalInputAmounts(p => ({ ...p, [g.id]: e.target.value }))}
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#458B73] focus:border-transparent" />
                        <button onClick={() => handleGoalAddMoney(g)} className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer" style={{ background: "rgba(69,139,115,0.15)", color: "#458B73" }}>+ Setor</button>
                        <button onClick={() => handleGoalWithdrawMoney(g)} className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer" style={{ background: "rgba(242,96,118,0.1)", color: "#F26076" }}>− Tarik</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ===== PIE CHARTS (left, 2 stacked) + RIWAYAT CASHFLOW (right) ===== */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-16">
          {/* Pie Charts */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            <div className="p-8 rounded-2xl bg-white shadow-sm border border-gray-100 flex-1 flex flex-col">
              <h3 className="font-extrabold text-xl mb-5">Pengeluaran per Kategori</h3>
              <div className="flex items-center gap-5 flex-1">
                <div className="w-[150px] h-[150px] flex-shrink-0">
                  <Pie data={{ labels: categories, datasets: [{ data: charts.expenseByCategory, backgroundColor: PIE_COLORS_EXPENSE }] }} options={{ plugins: { legend: { display: false } }, maintainAspectRatio: true }} />
                </div>
                <div className="flex flex-col gap-2 text-xs min-w-0">
                  {categories.map((cat, i) => charts.expenseByCategory[i] > 0 && (
                    <div key={cat} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS_EXPENSE[i % PIE_COLORS_EXPENSE.length] }} />
                      <span className="truncate text-gray-600">{cat}</span>
                      <span className="ml-auto font-medium text-gray-800">{currency(charts.expenseByCategory[i])}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-8 rounded-2xl bg-white shadow-sm border border-gray-100 flex-1 flex flex-col">
              <h3 className="font-extrabold text-xl mb-5">Pemasukan per Kategori</h3>
              <div className="flex items-center gap-5 flex-1">
                <div className="w-[150px] h-[150px] flex-shrink-0">
                  <Pie data={{ labels: categories, datasets: [{ data: charts.incomeByCategory, backgroundColor: PIE_COLORS_INCOME }] }} options={{ plugins: { legend: { display: false } }, maintainAspectRatio: true }} />
                </div>
                <div className="flex flex-col gap-2 text-xs min-w-0">
                  {categories.map((cat, i) => charts.incomeByCategory[i] > 0 && (
                    <div key={cat} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS_INCOME[i % PIE_COLORS_INCOME.length] }} />
                      <span className="truncate text-gray-600">{cat}</span>
                      <span className="ml-auto font-medium text-gray-800">{currency(charts.incomeByCategory[i])}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Riwayat Cashflow — stretches to match pies */}
          <div className="lg:col-span-3 p-8 rounded-2xl bg-white shadow-sm border border-gray-100 flex flex-col">
            <h3 className="font-extrabold text-xl mb-4">💸 Riwayat Cashflow</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              <button onClick={() => { setEditingTx(null); setIsTxModalOpen(true); }}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-white shadow-sm border-2 cursor-pointer hover:shadow-md"
                style={{ borderColor: "#458B73", color: "#458B73" }}>+ Tambah Transaksi</button>
              <select className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as "ALL" | TransactionType)}>
                <option value="ALL">Semua Tipe</option><option value="INCOME">Masuk</option><option value="EXPENSE">Keluar</option>
              </select>
              <select className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="ALL">Semua Kategori</option>
                {categories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
              </select>
            </div>
            <div className="space-y-1 overflow-y-auto flex-1">
              {filteredTransactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-gray-50 group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                      style={{ background: t.type === "INCOME" ? "rgba(69,139,115,0.1)" : "rgba(242,96,118,0.1)", color: t.type === "INCOME" ? "#458B73" : "#F26076" }}>
                      {t.type === "INCOME" ? "↑" : "↓"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-gray-800 truncate">{t.category}</p>
                      <div className="flex gap-1.5 text-[11px] text-gray-400">
                        <span>{t.date}</span>{t.note && <span>• {t.note}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <p className="font-semibold text-sm" style={{ color: t.type === "INCOME" ? "#458B73" : "#F26076" }}>
                      {t.type === "INCOME" ? "+" : "-"}{currency(t.amount)}
                    </p>
                    <div className="opacity-0 group-hover:opacity-100 flex gap-0.5">
                      <button onClick={() => { setEditingTx(t); setIsTxModalOpen(true); }} className="p-1 hover:bg-gray-200 rounded text-xs cursor-pointer">✏️</button>
                      <button onClick={() => handleDeleteTransaction(t.id)} className="p-1 hover:bg-red-100 rounded text-xs text-red-500 cursor-pointer">🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredTransactions.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">Belum ada transaksi.</div>}
            </div>
          </div>
        </section>

        {/* ===== LINE CHART (left) + HUTANG/PIUTANG stacked (right) ===== */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-16">
          {/* Line Chart — left, wider */}
          <div className="lg:col-span-3 p-8 rounded-2xl bg-white shadow-sm border border-gray-100">
            <h3 className="font-extrabold text-xl mb-1">📈 Analisis Cashflow</h3>
            <p className="text-sm text-gray-400 mb-5">{monthLabel(selectedMonth)} {selectedYear}</p>
            <div style={{ height: "400px" }}>
              <Line
                data={{
                  labels: charts.labels,
                  datasets: [
                    { label: "Pemasukan", data: charts.incomeLine, borderColor: "#458B73", backgroundColor: "rgba(69,139,115,0.15)", tension: 0.3, borderWidth: 2, pointRadius: 3 },
                    { label: "Pengeluaran", data: charts.expenseLine, borderColor: "#F26076", backgroundColor: "rgba(242,96,118,0.15)", tension: 0.3, borderWidth: 2, pointRadius: 3 },
                  ],
                }}
                options={{ maintainAspectRatio: false, plugins: { legend: { position: "top", labels: { usePointStyle: true, pointStyle: "circle", boxWidth: 6, font: { size: 12 } } }, tooltip: { callbacks: { title: (items: any[]) => items[0]?.label || '' } } }, scales: { y: { beginAtZero: true, ticks: { font: { size: 11 } } }, x: { ticks: { font: { size: 10 }, maxRotation: 45, autoSkip: true, maxTicksLimit: 15 } } } }}
                height={400}
              />
            </div>
          </div>

          {/* Hutang (top) + Piutang (bottom) — stacked right */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            {/* Hutang */}
            <div className="p-7 rounded-2xl bg-white shadow-sm border border-gray-100 flex-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-extrabold text-lg" style={{ color: "#F26076" }}>📕 Hutang Saya</h3>
                <button onClick={() => { setLoanTab("PAYABLE"); setEditingLoan(null); setIsLoanModalOpen(true); }}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium cursor-pointer" style={{ background: "rgba(242,96,118,0.1)", color: "#F26076" }}>+ Hutang</button>
              </div>
              <div className="space-y-3 overflow-y-auto" style={{ maxHeight: "200px" }}>
                {payableLoans.map((l) => (
                  <div key={l.id} className="border border-gray-100 rounded-xl p-3 hover:shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-gray-900">{l.name}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${l.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>{l.status === 'PAID' ? 'Lunas' : 'Belum Lunas'}</span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">{l.dueDate && !l.dueDate.includes('2099') ? `Jatuh Tempo: ${l.dueDate}` : 'Tanpa tenggat waktu'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-gray-400">Sisa</p>
                        <p className="font-bold text-sm" style={{ color: "#F26076" }}>{currency(l.remaining)}</p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-1.5 border-t border-gray-50 pt-2 mt-1">
                      {l.status !== "PAID" && (
                        <button onClick={() => { setActiveLoanForPayment(l); setIsPaymentModalOpen(true); }}
                          className="text-[11px] px-2.5 py-1 rounded-lg font-medium cursor-pointer" style={{ background: "rgba(69,139,115,0.1)", color: "#458B73" }}>Bayar</button>
                      )}
                      <button onClick={() => { setEditingLoan(l); setLoanTab("PAYABLE"); setIsLoanModalOpen(true); }}
                        className="text-[11px] px-2.5 py-1 bg-gray-50 text-gray-500 rounded-lg hover:bg-gray-100 cursor-pointer">Edit</button>
                      <button onClick={() => handleDeleteLoan(l.id)}
                        className="text-[11px] px-2.5 py-1 rounded-lg cursor-pointer" style={{ background: "rgba(242,96,118,0.1)", color: "#F26076" }}>Hapus</button>
                    </div>
                  </div>
                ))}
                {payableLoans.length === 0 && <div className="text-center py-5 text-gray-400 text-sm bg-gray-50 rounded-xl border border-dashed">Belum ada hutang.</div>}
              </div>
            </div>

            {/* Piutang */}
            <div className="p-7 rounded-2xl bg-white shadow-sm border border-gray-100 flex-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-extrabold text-lg" style={{ color: "#458B73" }}>📗 Piutang</h3>
                <button onClick={() => { setLoanTab("RECEIVABLE"); setEditingLoan(null); setIsLoanModalOpen(true); }}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium cursor-pointer" style={{ background: "rgba(69,139,115,0.1)", color: "#458B73" }}>+ Piutang</button>
              </div>
              <div className="space-y-3 overflow-y-auto" style={{ maxHeight: "200px" }}>
                {receivableLoans.map((l) => (
                  <div key={l.id} className="border border-gray-100 rounded-xl p-3 hover:shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-gray-900">{l.name}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${l.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-50 text-yellow-600'}`}>{l.status === 'PAID' ? 'Lunas' : 'Belum Dibayar'}</span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">{l.dueDate && !l.dueDate.includes('2099') ? `Jatuh Tempo: ${l.dueDate}` : 'Tanpa tenggat waktu'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-gray-400">Sisa</p>
                        <p className="font-bold text-sm" style={{ color: "#458B73" }}>{currency(l.remaining)}</p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-1.5 border-t border-gray-50 pt-2 mt-1">
                      {l.status !== "PAID" && (
                        <button onClick={() => { setActiveLoanForPayment(l); setIsPaymentModalOpen(true); }}
                          className="text-[11px] px-2.5 py-1 rounded-lg font-medium cursor-pointer" style={{ background: "rgba(69,139,115,0.1)", color: "#458B73" }}>Terima</button>
                      )}
                      <button onClick={() => { setEditingLoan(l); setLoanTab("RECEIVABLE"); setIsLoanModalOpen(true); }}
                        className="text-[11px] px-2.5 py-1 bg-gray-50 text-gray-500 rounded-lg hover:bg-gray-100 cursor-pointer">Edit</button>
                      <button onClick={() => handleDeleteLoan(l.id)}
                        className="text-[11px] px-2.5 py-1 rounded-lg cursor-pointer" style={{ background: "rgba(242,96,118,0.1)", color: "#F26076" }}>Hapus</button>
                    </div>
                  </div>
                ))}
                {receivableLoans.length === 0 && <div className="text-center py-5 text-gray-400 text-sm bg-gray-50 rounded-xl border border-dashed">Belum ada piutang.</div>}
              </div>
            </div>
          </div>
        </section>

        {/* ===== MODALS ===== */}
        <Modal isOpen={isTxModalOpen} onClose={() => setIsTxModalOpen(false)} title={editingTx ? "Edit Transaksi" : "Tambah Transaksi"}>
          <TransactionForm categories={categories} categoryObjects={categoryObjects} initialData={editingTx} onClose={() => setIsTxModalOpen(false)} wallets={wallets} />
        </Modal>
        <Modal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} title="Kelola Kategori">
          <CategoryManager categories={categoryObjects} />
        </Modal>
        <Modal isOpen={isLoanModalOpen} onClose={() => setIsLoanModalOpen(false)} title={editingLoan ? "Edit Hutang/Piutang" : (loanTab === "PAYABLE" ? "Tambah Hutang" : "Tambah Piutang")}>
          <LoanForm initialData={editingLoan} onClose={() => setIsLoanModalOpen(false)} defaultType={loanTab} />
        </Modal>
        <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Pembayaran Cicilan">
          {activeLoanForPayment && <PaymentForm loanId={activeLoanForPayment.id} loanName={activeLoanForPayment.name} remaining={activeLoanForPayment.remaining} loanType={activeLoanForPayment.type} onClose={() => setIsPaymentModalOpen(false)} />}
        </Modal>
        <Modal isOpen={isBudgetModalOpen} onClose={() => setIsBudgetModalOpen(false)} title="Atur Budget">
          <BudgetForm categories={categoryObjects} initialData={editingBudget} onClose={() => setIsBudgetModalOpen(false)} />
        </Modal>
        <Modal isOpen={isGoalCreateOpen} onClose={() => setIsGoalCreateOpen(false)} title="Buat Target Tabungan">
          <GoalCreateForm onClose={() => setIsGoalCreateOpen(false)} />
        </Modal>
        <Modal isOpen={isWalletDistOpen} onClose={() => setIsWalletDistOpen(false)} title="Atur Pembagian Saldo">
          <WalletDistributor wallets={wallets || []} totalBalance={totals.balance} onClose={() => setIsWalletDistOpen(false)} />
        </Modal>
        <ImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          title="Import & Ekspor CSV"
          transactions={transactions}
          totalBalance={totals.balance}
        />
      </div>
    </main>
  );
}