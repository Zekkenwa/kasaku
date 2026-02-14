"use client";

import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, PointElement, LineElement, Filler,
} from "chart.js";
import { Pie, Line } from "react-chartjs-2";
import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
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
import RecurringManager from "@/components/RecurringManager";
import DateRangePicker from "@/components/DateRangePicker";
import PaymentForm from "@/components/PaymentForm";
import TransactionManagerModal from "@/components/TransactionManagerModal";
import Footer from "@/components/Footer";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler);

type TransactionType = "INCOME" | "EXPENSE";
type Transaction = { id: string; type: TransactionType; category: string; amount: number; note?: string; date: string; walletId?: string };
type Loan = { id: string; name: string; amount: number; remaining: number; createdAt: string; dueDate?: string; status: "ONGOING" | "PAID"; type: "PAYABLE" | "RECEIVABLE"; payments: { id: string; amount: number; date: string; note?: string }[] };
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
  firstTxDate: string | null;
};

const currency = (v: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);
const monthLabel = (m: number) => new Intl.DateTimeFormat("id-ID", { month: "long" }).format(new Date(2020, m - 1, 1));

const PIE_COLORS_EXPENSE = ["#F26076", "#FF9760", "#FFD150", "#458B73", "#e11d48", "#ea580c", "#ca8a04", "#0f766e"];
const PIE_COLORS_INCOME = ["#458B73", "#10b981", "#059669", "#34d399", "#FFD150", "#F26076", "#FF9760", "#06b6d4"];

export default function DashboardClient({
  userName, categories, transactions, totals, charts, loans, budgets, wallets,
  monthOptions, yearOptions, selectedMonth, selectedYear, categoryObjects, goals, dateRange, firstTxDate,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();

  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txModalTab, setTxModalTab] = useState<"TRANSACTION" | "CATEGORY">("TRANSACTION");
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isGoalCreateOpen, setIsGoalCreateOpen] = useState(false);
  const [isWalletDistOpen, setIsWalletDistOpen] = useState(false);

  // Pagination / Carousel State
  const [txPage, setTxPage] = useState(1);
  const ITEMS_PER_PAGE = 6;
  const [activePie, setActivePie] = useState<"INCOME" | "EXPENSE">("INCOME");

  const [isRecurringManagerOpen, setIsRecurringManagerOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activeLoanForPayment, setActiveLoanForPayment] = useState<Loan | null>(null);
  const [loanTab, setLoanTab] = useState<"PAYABLE" | "RECEIVABLE">("PAYABLE");
  const [hideSaldo, setHideSaldo] = useState(true);
  const [pageWarning, setPageWarning] = useState<string | null>(null);
  const [pageInput, setPageInput] = useState(txPage.toString());

  useEffect(() => {
    setPageInput(txPage.toString());
  }, [txPage]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("kasaku_hide_saldo");
      if (stored !== null) {
        setHideSaldo(stored === "true");
      }
      // If null, it stays true (default)

      // Process recurring transactions
      fetch("/api/recurring/process", { method: "POST" })
        .then(res => res.json())
        .then(data => {
          if (data.processed > 0) {
            console.log("Processed recurring:", data.processed);
            router.refresh();
          }
        })
        .catch(err => console.error("Error processing recurring:", err));
    }
  }, []);
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

  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
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
    const p = new URLSearchParams(searchParams.toString());
    p.set("month", String(month));
    p.set("year", String(year));
    p.delete("start");
    p.delete("end");
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

  // px = clamp(1.25rem, 5vw, 8rem) for responsive margins
  const sideMargin = "clamp(1.25rem, 5vw, 8rem)";

  return (
    <main className="min-h-screen pb-20 transition-colors duration-300" style={{ background: "var(--background)" }}>
      {/* ===== HEADER ===== */}
      {/* ===== HEADER ===== */}
      <div className="pt-8 pb-14 rounded-b-3xl shadow-sm relative" style={{ paddingLeft: sideMargin, paddingRight: sideMargin }}>
        {/* Background & Decoration Container */}
        <div className="absolute inset-0 overflow-hidden rounded-b-3xl z-0" style={{ background: "var(--header-gradient)" }}>
          {/* Decorative Circles */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 md:w-64 md:h-64 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-24 h-24 md:w-48 md:h-48 rounded-full bg-yellow-400/20 blur-2xl pointer-events-none"></div>
        </div>

        <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 md:mb-10 gap-4 relative z-30">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Kasaku" className="w-10 h-10 rounded-xl shadow-lg" />
            <div>
              <p className="text-sm text-white/80 font-medium">Selamat datang</p>
              <h1 className="text-2xl font-bold text-white drop-shadow-sm">{userName}</h1>
            </div>
          </div>
          <div className="flex gap-2 items-center w-full md:w-auto">
            <div className="flex gap-2 items-center overflow-x-auto pb-1 md:pb-0 no-scrollbar mask-grad-right flex-1 md:flex-none">
              <button onClick={() => { setTxModalTab("CATEGORY"); setIsTxModalOpen(true); }} className="whitespace-nowrap px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-medium bg-white/20 text-white border border-white/30 hover:bg-white/30 backdrop-blur-sm cursor-pointer shadow-sm transition-all flex-shrink-0">📁 Kategori</button>
              <button onClick={() => setIsImportModalOpen(true)} className="whitespace-nowrap px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-medium bg-white/20 text-white border border-white/30 hover:bg-white/30 backdrop-blur-sm cursor-pointer shadow-sm transition-all flex-shrink-0">📥 Import</button>
              <button onClick={() => setIsWalletDistOpen(true)} className="whitespace-nowrap px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-medium bg-white/20 text-white border border-white/30 hover:bg-white/30 backdrop-blur-sm cursor-pointer shadow-sm transition-all flex-shrink-0">💼 Wallet</button>
              <button onClick={() => router.push('/donasi')} className="whitespace-nowrap px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-medium bg-[#FFD150]/20 text-[#FFD150] border border-[#FFD150]/30 hover:bg-[#FFD150]/30 backdrop-blur-sm cursor-pointer shadow-sm transition-all flex-shrink-0">🎁 Donasi</button>
            </div>

            <div className="flex-shrink-0">
              <AccountMenu />
            </div>
          </div>
        </header>


        {/* ===== SALDO (left, wider) | PEMASUKAN + PENGELUARAN stacked (right) ===== */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          {/* SALDO CARD — left: title+amount, right: wallet breakdown */}
          <div className="p-7 rounded-2xl bg-white dark:bg-gray-800 card-fix backdrop-blur-sm shadow-lg card-hover flex flex-col md:flex-row items-stretch transition-colors duration-300">
            {/* Left: icon + title + amount */}
            <div className="flex flex-col justify-center min-w-0 pr-5 mb-4 md:mb-0">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-md transform rotate-3" style={{ background: "linear-gradient(135deg, #458B73, #458B73dd)" }}>
                  <span className="text-white text-2xl">💰</span>
                </div>
                <p className="text-4xl font-extrabold text-white dark:text-gray-200 tracking-tight">Saldo</p>
                <button onClick={toggleHideSaldo} className="ml-1 text-white hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer" title={hideSaldo ? "Tampilkan saldo" : "Sembunyikan saldo"}>
                  {hideSaldo ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight" style={{ color: "#458B73" }}>{censor(currency(totals.balance))}</h2>
            </div>
            {/* Right: wallet distribution */}
            <div className="pl-0 md:pl-5 border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-700 pt-4 md:pt-0 flex flex-col justify-center flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-gray-700 dark:text-gray-400 uppercase tracking-wide mb-2">Pembagian</p>
              <div className="space-y-1.5">
                {wallets && wallets.length > 0 ? wallets.map(w => (
                  <div key={w.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full flex-shrink-0 shadow-sm" style={{ background: w.type === "CASH" ? "#458B73" : w.type === "BANK" ? "#3b82f6" : "#8b5cf6" }} />
                      <span className="text-xs text-white dark:text-gray-300 truncate font-medium">{w.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-white dark:text-gray-200 whitespace-nowrap">{censor(currency(w.initialBalance))}</span>
                  </div>
                )) : (
                  <p className="text-[10px] text-gray-900 dark:text-gray-400 italic">Belum ada wallet</p>
                )}
              </div>
              <button onClick={() => setIsWalletDistOpen(true)}
                className="mt-2 w-full px-2 py-1.5 rounded-lg text-[10px] font-semibold cursor-pointer border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 dark:text-white hover:border-[#458B73] hover:text-[#458B73] dark:hover:border-[#458B73] dark:hover:text-[#458B73] transition-colors">
                💼 Atur Saldo
              </button>
            </div>
          </div>
          {/* PEMASUKAN + PENGELUARAN stacked right */}
          <div className="flex flex-col gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 card-fix backdrop-blur-sm shadow-lg card-hover flex-1 flex flex-col justify-center transition-colors duration-300">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md" style={{ background: "linear-gradient(135deg, #FFD150, #FF9760)" }}>
                  <span className="text-white text-xl">📈</span>
                </div>
                <p className="text-2xl font-extrabold text-white dark:text-gray-200">Pemasukan</p>
                <button onClick={toggleHideSaldo} className="ml-1 text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 transition-colors cursor-pointer" title={hideSaldo ? "Tampilkan" : "Sembunyikan"}>
                  {hideSaldo ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight" style={{ color: "#FF9760" }}>{censor(currency(totals.totalIncome))}</h2>
            </div>
            <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 card-fix backdrop-blur-sm shadow-lg card-hover flex-1 flex flex-col justify-center transition-colors duration-300">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md" style={{ background: "linear-gradient(135deg, #F26076, #F26076dd)" }}>
                  <span className="text-white text-xl">📉</span>
                </div>
                <p className="text-2xl font-extrabold text-white dark:text-gray-200">Pengeluaran</p>
                <button onClick={toggleHideSaldo} className="ml-1 text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 transition-colors cursor-pointer" title={hideSaldo ? "Tampilkan" : "Sembunyikan"}>
                  {hideSaldo ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight" style={{ color: "#F26076" }}>{censor(currency(totals.totalExpense))}</h2>
            </div>
          </div>
        </section>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="py-8 space-y-8 md:py-16 md:space-y-16" style={{ paddingLeft: sideMargin, paddingRight: sideMargin }}>

        {/* Recurring Transactions (Rutinitas) */}
        <RecurringManager categories={categoryObjects} wallets={wallets || []} />

        {/* Date Filter */}
        <section className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-white dark:bg-gray-800 card-fix p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-300">
          <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg w-full sm:w-auto">
            <button onClick={() => { setDateFilterMode("MONTHLY"); if (searchParams.has('start')) { updateMonthYear(new Date().getMonth() + 1, new Date().getFullYear()); } }}
              className={`flex-1 sm:flex-none px-3 py-1.5 text-sm rounded-md cursor-pointer transition-colors ${dateFilterMode === "MONTHLY" ? "bg-white dark:bg-gray-600 shadow text-white dark:text-white font-medium" : "text-white dark:text-gray-400 hover:text-white dark:hover:text-gray-200"}`}>Bulanan</button>
            <button onClick={() => setDateFilterMode("CUSTOM")}
              className={`flex-1 sm:flex-none px-3 py-1.5 text-sm rounded-md cursor-pointer transition-colors ${dateFilterMode === "CUSTOM" ? "bg-white dark:bg-gray-600 shadow text-white dark:text-white font-medium" : "text-white dark:text-gray-400 hover:text-white dark:hover:text-gray-200"}`}>Kustom</button>
          </div>
          {dateFilterMode === "MONTHLY" && (
            <div className="flex gap-2 w-full sm:w-auto">
              <select className="flex-1 sm:flex-none border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-white dark:text-gray-200 focus:ring-2 focus:ring-[#458B73] focus:outline-none" value={selectedMonth} onChange={(e) => updateMonthYear(Number(e.target.value), selectedYear)}>
                {monthOptions.map((m) => (<option key={m} value={m}>{monthLabel(m)}</option>))}
              </select>
              <select className="flex-1 sm:flex-none border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-white dark:text-gray-200 focus:ring-2 focus:ring-[#458B73] focus:outline-none" value={selectedYear} onChange={(e) => updateMonthYear(selectedMonth, Number(e.target.value))}>
                {yearOptions.map((y) => (<option key={y} value={y}>{y}</option>))}
              </select>
            </div>
          )}
          {dateFilterMode === "CUSTOM" && <DateRangePicker startDate={dateRange.start} endDate={dateRange.end} firstTxDate={firstTxDate} onApply={updateCustomRange} />}
        </section>

        {/* ===== BUDGET (left) + TARGET TABUNGAN (right) ===== */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div className="p-8 rounded-2xl bg-white dark:bg-gray-800 card-fix shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-300">
            <h3 className="font-extrabold text-xl mb-4 text-white dark:text-white">📊 Budget Status</h3>
            <button onClick={() => { setEditingBudget(null); setIsBudgetModalOpen(true); }}
              className="text-sm px-5 py-2.5 rounded-xl font-medium mb-6 cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600 text-white dark:text-gray-400 hover:border-gray-400 hover:text-gray-700 dark:hover:border-gray-500 dark:hover:text-gray-200 transition-colors">
              + Tambah Budget
            </button>
            <div className="grid grid-cols-1 gap-4">
              {budgets.map((b) => (
                <BudgetProgress key={b.id} id={b.id} categoryName={b.categoryName} limit={b.limitAmount} spent={spentByCategory[b.categoryName] || 0} period={b.period}
                  onEdit={() => { setEditingBudget({ categoryId: b.categoryId, limitAmount: b.limitAmount, id: b.id, period: b.period }); setIsBudgetModalOpen(true); }} />
              ))}
              {budgets.length === 0 && <p className="text-gray-900 dark:text-gray-400 italic text-sm">Belum ada budget yang diatur.</p>}
            </div>
          </div>

          <div className="p-8 rounded-2xl bg-white dark:bg-gray-800 card-fix shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-300">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-extrabold text-xl text-white dark:text-white">🎯 Target Tabungan</h3>
              <button onClick={() => { setEditingGoal(null); setIsGoalCreateOpen(true); }}
                className="text-sm px-5 py-2.5 rounded-xl font-medium cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600 text-white dark:text-gray-400 hover:border-gray-400 hover:text-gray-700 dark:hover:border-gray-500 dark:hover:text-gray-200 transition-colors">
                + Buat Target
              </button>
            </div>
            {goals.length === 0 ? (
              <p className="text-gray-900 dark:text-gray-400 italic text-sm text-center py-10">Belum ada target. Klik &quot;Buat Target&quot; untuk menambahkan.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {goals.map(g => {
                  const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
                  return (
                    <div key={g.id}
                      onClick={() => { setEditingGoal(g); setIsGoalCreateOpen(true); }}
                      className="p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-md card-hover relative cursor-pointer bg-white dark:bg-gray-800 card-fix transition-colors"
                    >
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteGoal(g.id); }} className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer text-sm transition-colors" title="Hapus">✕</button>
                      <div className="flex items-center justify-between mb-2 pr-8">
                        <p className="font-bold text-sm text-white dark:text-gray-200">{g.name}</p>
                        <span className="text-xs font-bold" style={{ color: pct >= 100 ? "#458B73" : "#FF9760" }}>{pct}%</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 mb-2">
                        <div className="h-2.5 rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 100 ? "#458B73" : "linear-gradient(90deg, #FFD150, #FF9760)" }} />
                      </div>
                      <div className="flex justify-between text-xs text-white dark:text-gray-400 mb-3">
                        <span>{currency(g.currentAmount)}</span><span>{currency(g.targetAmount)}</span>
                      </div>
                      {g.deadline && <p className="text-[10px] text-white dark:text-gray-400 mb-3">Deadline: {new Date(g.deadline).toLocaleDateString("id-ID")}</p>}
                      <div className="flex flex-col sm:flex-row gap-2 items-center sm:items-stretch mt-3" onClick={(e) => e.stopPropagation()}>
                        <input type="number" placeholder="Jumlah..." value={goalInputAmounts[g.id] || ""} onChange={(e) => setGoalInputAmounts(p => ({ ...p, [g.id]: e.target.value }))}
                          className="w-full sm:flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#458B73] focus:border-transparent bg-white dark:bg-gray-700 text-white dark:text-gray-200" />
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button onClick={() => handleGoalAddMoney(g)} className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer hover:bg-opacity-20 transition-all whitespace-nowrap" style={{ background: "rgba(69,139,115,0.15)", color: "#458B73" }}>+ Setor</button>
                          <button onClick={() => handleGoalWithdrawMoney(g)} className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer hover:bg-opacity-20 transition-all whitespace-nowrap" style={{ background: "rgba(242,96,118,0.1)", color: "#F26076" }}>− Tarik</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ===== PIE CHARTS (left, 2 stacked) + RIWAYAT CASHFLOW (right) ===== */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-16">
          {/* Pie Charts */}
          <div className="lg:col-span-2 flex flex-col gap-4 lg:gap-8">
            <div className="p-4 md:p-8 rounded-2xl bg-white dark:bg-gray-800 card-fix shadow-sm border border-gray-100 dark:border-gray-700 flex-1 flex flex-col transition-colors duration-300">
              <h3 className="font-extrabold text-xl mb-5 text-white dark:text-white">Pengeluaran per Kategori</h3>
              <div className="flex items-center gap-5 flex-1">
                <div className="w-[120px] h-[120px] md:w-[150px] md:h-[150px] flex-shrink-0">
                  <Pie data={{ labels: categories, datasets: [{ data: charts.expenseByCategory, backgroundColor: PIE_COLORS_EXPENSE, borderWidth: 0 }] }} options={{ plugins: { legend: { display: false } }, maintainAspectRatio: true }} />
                </div>
                <div className="flex flex-col gap-2 text-xs min-w-0">
                  {categories.map((cat, i) => charts.expenseByCategory[i] > 0 && (
                    <div key={cat} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS_EXPENSE[i % PIE_COLORS_EXPENSE.length] }} />
                      <span className="truncate text-white dark:text-gray-300">{cat}</span>
                      <span className="ml-auto font-medium text-white dark:text-gray-200">{currency(charts.expenseByCategory[i])}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 md:p-8 rounded-2xl bg-white dark:bg-gray-800 card-fix shadow-sm border border-gray-100 dark:border-gray-700 flex-1 flex flex-col transition-colors duration-300">
              <h3 className="font-extrabold text-xl mb-5 text-white dark:text-white">Pemasukan per Kategori</h3>
              <div className="flex items-center gap-5 flex-1">
                <div className="w-[120px] h-[120px] md:w-[150px] md:h-[150px] flex-shrink-0">
                  <Pie data={{ labels: categories, datasets: [{ data: charts.incomeByCategory, backgroundColor: PIE_COLORS_INCOME, borderWidth: 0 }] }} options={{ plugins: { legend: { display: false } }, maintainAspectRatio: true }} />
                </div>
                <div className="flex flex-col gap-2 text-xs min-w-0">
                  {categories.map((cat, i) => charts.incomeByCategory[i] > 0 && (
                    <div key={cat} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS_INCOME[i % PIE_COLORS_INCOME.length] }} />
                      <span className="truncate text-white dark:text-gray-300">{cat}</span>
                      <span className="ml-auto font-medium text-white dark:text-gray-200">{currency(charts.incomeByCategory[i])}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Riwayat Cashflow — stretches to match pies */}
          <div className="lg:col-span-3 p-4 md:p-8 rounded-2xl bg-white dark:bg-gray-800 card-fix shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col transition-colors duration-300">
            <h3 className="font-extrabold text-xl mb-4 text-white dark:text-white">💸 Riwayat Cashflow</h3>
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <button onClick={() => { setEditingTx(null); setTxModalTab("TRANSACTION"); setIsTxModalOpen(true); }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-medium bg-white dark:bg-gray-700 shadow-sm border-2 cursor-pointer hover:shadow-md transition-colors"
                style={{ borderColor: "#458B73", color: "#458B73" }}>+ Tambah Transaksi</button>
              <div className="flex gap-2">
                <select className="flex-1 w-full sm:w-auto border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-white dark:text-gray-200 focus:outline-none" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as "ALL" | TransactionType)}>
                  <option value="ALL">Semua Tipe</option><option value="INCOME">Masuk</option><option value="EXPENSE">Keluar</option>
                </select>
                <select className="flex-1 w-full sm:w-auto border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-white dark:text-gray-200 focus:outline-none" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="ALL">Semua Kategori</option>
                  {categories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
                </select>
              </div>
            </div>
            <div className="space-y-1 flex-1">
              {filteredTransactions.slice((txPage - 1) * ITEMS_PER_PAGE, txPage * ITEMS_PER_PAGE).map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 group transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                      style={{ background: t.type === "INCOME" ? "rgba(69,139,115,0.1)" : "rgba(242,96,118,0.1)", color: t.type === "INCOME" ? "#458B73" : "#F26076" }}>
                      {t.type === "INCOME" ? "↑" : "↓"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-white dark:text-gray-200 truncate">{t.category}</p>
                      <div className="flex gap-1.5 text-[11px] text-gray-900 dark:text-gray-400">
                        <span>{t.date}</span>{t.note && <span>• {t.note}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <p className="font-semibold text-sm" style={{ color: t.type === "INCOME" ? "#458B73" : "#F26076" }}>
                      {t.type === "INCOME" ? "+" : "-"}{currency(t.amount)}
                    </p>
                    <div className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 flex gap-0.5 transition-opacity">
                      <button onClick={() => { setEditingTx(t); setTxModalTab("TRANSACTION"); setIsTxModalOpen(true); }} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-xs cursor-pointer">✏️</button>
                      <button onClick={() => handleDeleteTransaction(t.id)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded text-xs text-red-500 cursor-pointer">🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredTransactions.length === 0 && <div className="text-center py-12 text-white dark:text-gray-400 text-sm">Belum ada transaksi.</div>}
            </div>

            {/* Pagination Controls */}
            {filteredTransactions.length > ITEMS_PER_PAGE && (
              <div className="flex justify-between items-center pt-4 mt-2 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => setTxPage(p => Math.max(1, p - 1))}
                  disabled={txPage === 1}
                  className="px-3 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  ←
                </button>
                <div className="flex items-center gap-2 relative">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Page</span>
                  <input
                    type="number"
                    min={1}
                    max={Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE)}
                    value={pageInput}
                    onChange={(e) => {
                      const valStr = e.target.value;
                      setPageInput(valStr);
                      const val = parseInt(valStr);
                      const max = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);

                      if (valStr === "") return;
                      if (isNaN(val)) return;

                      if (val > max) {
                        setPageWarning(`Maks: ${max}`);
                      } else {
                        setPageWarning(null);
                        if (val >= 1) setTxPage(val);
                      }
                    }}
                    onFocus={() => setPageInput("")}
                    onBlur={() => {
                      setPageWarning(null);
                      if (pageInput === "" || isNaN(parseInt(pageInput))) {
                        setPageInput(txPage.toString());
                      }
                    }}
                    className="w-12 px-1 py-0.5 text-center text-xs border rounded bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                  />
                  {pageWarning && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded shadow whitespace-nowrap z-10 animate-fade-in-up">
                      {pageWarning}
                    </div>
                  )}
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    / {Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE)}
                  </span>
                </div>
                <button
                  onClick={() => setTxPage(p => Math.min(Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE), p + 1))}
                  disabled={txPage === Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE)}
                  className="px-3 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  →
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ===== LINE CHART (left) + HUTANG/PIUTANG stacked (right) ===== */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-16">
          {/* Line Chart — left, wider */}
          <div className="lg:col-span-3 p-4 md:p-8 rounded-2xl bg-white dark:bg-gray-800 card-fix shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-300">
            <h3 className="font-extrabold text-xl mb-1 text-white dark:text-white">📈 Analisis Cashflow</h3>
            <p className="text-sm text-gray-400 mb-5">{monthLabel(selectedMonth)} {selectedYear}</p>
            <div className="h-[250px] md:h-[400px]">
              <Line
                data={{
                  labels: charts.labels,
                  datasets: [
                    {
                      label: "Pemasukan",
                      data: charts.incomeLine,
                      borderColor: "#458B73",
                      backgroundColor: "rgba(69,139,115,0.1)",
                      tension: 0.4,
                      borderWidth: 3,
                      pointRadius: 0,
                      pointHoverRadius: 6,
                      fill: true
                    },
                    {
                      label: "Pengeluaran",
                      data: charts.expenseLine,
                      borderColor: "#F26076",
                      backgroundColor: "rgba(242,96,118,0.1)",
                      tension: 0.4,
                      borderWidth: 3,
                      pointRadius: 0,
                      pointHoverRadius: 6,
                      fill: true
                    },
                  ],
                }}
                options={{
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: "top",
                      labels: {
                        usePointStyle: true,
                        pointStyle: "circle",
                        boxWidth: 6,
                        font: { size: 12 },
                        color: theme === "dark" ? "#e5e7eb" : "#374151"
                      }
                    },
                    tooltip: {
                      mode: 'index',
                      intersect: false,
                      backgroundColor: theme === "dark" ? "#1f2937" : "#fff",
                      titleColor: theme === "dark" ? "#fff" : "#111827",
                      bodyColor: theme === "dark" ? "#fff" : "#374151",
                      borderColor: theme === "dark" ? "#374151" : "#e5e7eb",
                      borderWidth: 1,
                      callbacks: { title: (items: any[]) => items[0]?.label || '' }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        font: { size: 10 },
                        color: theme === "dark" ? "#9ca3af" : "#9ca3af",
                        maxTicksLimit: 6,
                        callback: (value) => {
                          if (typeof value === 'number') {
                            if (value >= 1000000) return (value / 1000000).toFixed(0) + 'jt';
                            if (value >= 1000) return (value / 1000).toFixed(0) + 'kf';
                            return value;
                          }
                          return value;
                        }
                      },
                      grid: {
                        display: false,
                      },
                      border: { display: false }
                    },
                    x: {
                      ticks: {
                        font: { size: 10 },
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 7,
                        color: theme === "dark" ? "#9ca3af" : "#9ca3af"
                      },
                      grid: { display: false },
                      border: { display: false }
                    }
                  }
                }}
                height={400}
              />
            </div>
          </div>

          {/* Hutang (top) + Piutang (bottom) — stacked right */}
          <div className="lg:col-span-2 flex flex-col gap-4 lg:gap-8">
            {/* Hutang */}
            <div className="p-4 md:p-7 rounded-2xl bg-white dark:bg-gray-800 card-fix shadow-sm border border-gray-100 dark:border-gray-700 flex-1 transition-colors duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-extrabold text-lg" style={{ color: "#F26076" }}>📕 Hutang Saya</h3>
                <button onClick={() => { setLoanTab("PAYABLE"); setEditingLoan(null); setIsLoanModalOpen(true); }}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium cursor-pointer" style={{ background: "rgba(242,96,118,0.1)", color: "#F26076" }}>+ Hutang</button>
              </div>
              <div className="space-y-3 overflow-y-auto custom-scrollbar" style={{ maxHeight: "200px" }}>
                {payableLoans.map((l) => {
                  const isOverdue = l.dueDate && new Date(l.dueDate) < new Date() && l.status !== 'PAID';
                  return (
                    <div key={l.id} className={`border rounded-xl p-3 hover:shadow-sm transition-all ${isOverdue ? "border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)] bg-red-50/10" : "border-gray-100 dark:border-gray-700"}`}>
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm text-white dark:text-gray-200">{l.name}</p>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${l.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>{l.status === 'PAID' ? 'Lunas' : 'Belum Lunas'}</span>
                          </div>
                          <p className="text-[11px] text-white dark:text-gray-400 mt-0.5">{l.dueDate && !l.dueDate.includes('2099') ? `Jatuh Tempo: ${new Date(l.dueDate).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}` : 'Tanpa tenggat waktu'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-white dark:text-gray-400">Sisa</p>
                          <p className="font-bold text-sm" style={{ color: "#F26076" }}>{currency(l.remaining)}</p>
                        </div>
                      </div>
                      <div className="flex justify-end gap-1.5 border-t border-gray-50 dark:border-gray-700 pt-2 mt-1">
                        {l.status !== "PAID" && (
                          <button onClick={() => { setActiveLoanForPayment(l); setIsPaymentModalOpen(true); }}
                            className="text-[11px] px-2.5 py-1 rounded-lg font-medium cursor-pointer" style={{ background: "rgba(69,139,115,0.1)", color: "#458B73" }}>Bayar</button>
                        )}
                        <button onClick={() => { setEditingLoan(l); setLoanTab("PAYABLE"); setIsLoanModalOpen(true); }}
                          className="text-[11px] px-2.5 py-1 bg-gray-50 dark:bg-gray-700 text-white dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors">Edit</button>
                        <button onClick={() => handleDeleteLoan(l.id)}
                          className="text-[11px] px-2.5 py-1 rounded-lg cursor-pointer" style={{ background: "rgba(242,96,118,0.1)", color: "#F26076" }}>Hapus</button>
                      </div>
                    </div>
                  );
                })}
                {payableLoans.length === 0 && <div className="text-center py-5 text-white dark:text-gray-400 text-sm bg-gray-50 dark:bg-gray-700 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">Belum ada hutang.</div>}
              </div>
            </div>

            {/* Piutang */}
            <div className="p-4 md:p-7 rounded-2xl bg-white dark:bg-gray-800 card-fix shadow-sm border border-gray-100 dark:border-gray-700 flex-1 transition-colors duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-extrabold text-lg" style={{ color: "#458B73" }}>📗 Piutang</h3>
                <button onClick={() => { setLoanTab("RECEIVABLE"); setEditingLoan(null); setIsLoanModalOpen(true); }}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium cursor-pointer" style={{ background: "rgba(69,139,115,0.1)", color: "#458B73" }}>+ Piutang</button>
              </div>
              <div className="space-y-3 overflow-y-auto custom-scrollbar" style={{ maxHeight: "200px" }}>
                {receivableLoans.map((l) => (
                  <div key={l.id} className="border border-gray-100 dark:border-gray-700 rounded-xl p-3 hover:shadow-sm transition-all">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-white dark:text-gray-200">{l.name}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${l.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-50 text-yellow-600'}`}>{l.status === 'PAID' ? 'Lunas' : 'Belum Dibayar'}</span>
                        </div>
                        <p className="text-[11px] text-white dark:text-gray-400 mt-0.5">{l.dueDate && !l.dueDate.includes('2099') ? `Jatuh Tempo: ${new Date(l.dueDate).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}` : 'Tanpa tenggat waktu'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-white dark:text-gray-400">Sisa</p>
                        <p className="font-bold text-sm" style={{ color: "#458B73" }}>{currency(l.remaining)}</p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-1.5 border-t border-gray-50 dark:border-gray-700 pt-2 mt-1">
                      {l.status !== "PAID" && (
                        <button onClick={() => { setActiveLoanForPayment(l); setIsPaymentModalOpen(true); }}
                          className="text-[11px] px-2.5 py-1 rounded-lg font-medium cursor-pointer" style={{ background: "rgba(69,139,115,0.1)", color: "#458B73" }}>Terima</button>
                      )}
                      <button onClick={() => { setEditingLoan(l); setLoanTab("RECEIVABLE"); setIsLoanModalOpen(true); }}
                        className="text-[11px] px-2.5 py-1 bg-gray-50 dark:bg-gray-700 text-white dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors">Edit</button>
                      <button onClick={() => handleDeleteLoan(l.id)}
                        className="text-[11px] px-2.5 py-1 rounded-lg cursor-pointer" style={{ background: "rgba(242,96,118,0.1)", color: "#F26076" }}>Hapus</button>
                    </div>
                  </div>
                ))}
                {receivableLoans.length === 0 && <div className="text-center py-5 text-white dark:text-gray-400 text-sm bg-gray-50 dark:bg-gray-700 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">Belum ada piutang.</div>}
              </div>
            </div>
          </div>
        </section>


        {/* ===== MODALS ===== */}
        {isTxModalOpen && (
          <TransactionManagerModal
            isOpen={isTxModalOpen}
            onClose={() => setIsTxModalOpen(false)}
            defaultTab={txModalTab}
            categories={categories}
            categoryObjects={categoryObjects}
            initialData={editingTx}
            wallets={wallets}
          />
        )}
        <Modal isOpen={isLoanModalOpen} onClose={() => setIsLoanModalOpen(false)} title={editingLoan ? "Edit Hutang/Piutang" : (loanTab === "PAYABLE" ? "Tambah Hutang" : "Tambah Piutang")}>
          <LoanForm initialData={editingLoan} onClose={() => setIsLoanModalOpen(false)} defaultType={loanTab} />
        </Modal>
        <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Pembayaran Cicilan">
          {activeLoanForPayment && <PaymentForm loanId={activeLoanForPayment.id} loanName={activeLoanForPayment.name} remaining={activeLoanForPayment.remaining} loanType={activeLoanForPayment.type} onClose={() => setIsPaymentModalOpen(false)} />}
        </Modal>
        <Modal isOpen={isBudgetModalOpen} onClose={() => setIsBudgetModalOpen(false)} title="Atur Budget">
          <BudgetForm categories={categoryObjects} initialData={editingBudget} onClose={() => setIsBudgetModalOpen(false)} />
        </Modal>
        <Modal isOpen={isGoalCreateOpen} onClose={() => setIsGoalCreateOpen(false)} title="Target Tabungan">
          <GoalCreateForm onClose={() => setIsGoalCreateOpen(false)} initialData={editingGoal} />
        </Modal>
        <Modal isOpen={isWalletDistOpen} onClose={() => setIsWalletDistOpen(false)} title="Atur Pembagian Saldo">
          <WalletDistributor wallets={wallets || []} totalBalance={totals.balance} onClose={() => setIsWalletDistOpen(false)} />
        </Modal>

        {/* Recurring Manager Embed - No longer a modal */}
        {/* We can place it here or where we want in the layout. 
            User said "Move to top", so we should place it in the main content area, 
            perhaps above the Date Filter or right below it. 
            Let's move 'RecurringManager' call to the main content section instead of modal section.
        */}

        <ImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          title="Import & Ekspor CSV"
          transactions={transactions}
          totalBalance={totals.balance}
        />
      </div>
      <Footer />
    </main>
  );
}
