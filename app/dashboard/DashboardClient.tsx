"use client";

import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, PointElement, LineElement, Filler,
} from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";
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

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler);

const centerTextPlugin = {
  id: 'centerText',
  afterDraw: (chart: any) => {
    const { ctx, chartArea: { top, bottom, left, right } } = chart;
    const text = chart.options.plugins.centerText?.text || '';
    const subtext = chart.options.plugins.centerText?.subtext || '';
    const isVisible = chart.options.plugins.centerText?.visible !== false;

    if (!isVisible) return;

    ctx.save();
    const centerX = (left + right) / 2;
    const centerY = (top + bottom) / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // "Total" text (Subtext)
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = '#737373';
    ctx.fillText(subtext.toUpperCase(), centerX, centerY - 12);

    // Amount text (Main)
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, centerX, centerY + 8);
    ctx.restore();
  }
};

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
  charts: {
    labels: string[];
    incomeLine: number[];
    expenseLine: number[];
    incomePie: { labels: string[]; data: number[] };
    expensePie: { labels: string[]; data: number[] };
  };
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
const formatCompactNumber = (number: number) => {
  if (number >= 1000000000) return (number / 1000000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (number >= 1000000) return (number / 1000000).toFixed(1).replace(/\.0$/, '') + 'jt';
  if (number >= 1000) return (number / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return number.toString();
};
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

  const [txPage, setTxPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activeLoanForPayment, setActiveLoanForPayment] = useState<Loan | null>(null);
  const [loanTab, setLoanTab] = useState<"PAYABLE" | "RECEIVABLE">("PAYABLE");
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [hideSaldo, setHideSaldo] = useState(true);
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

      // Process recurring transactions once on mount
      fetch("/api/recurring/process", { method: "POST" }).catch(err => console.error("Auto-process error:", err));
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

  const [activeAnalysis, setActiveAnalysis] = useState<"INCOME" | "EXPENSE">("EXPENSE");

  return (
    <main className="min-h-screen pb-20 bg-[#1E1E1E] text-white font-sans selection:bg-[#458B73] selection:text-white relative overflow-hidden">
      {/* Background Decoration */}
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#458B73]/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#F26076]/10 rounded-full blur-[100px] pointer-events-none" />

      {/* ===== HEADER & QUICK ACTIONS ===== */}
      <div className="relative z-10 px-6 pt-8 pb-4 md:px-12 md:pt-12">
        <header className="flex flex-col md:flex-row items-center justify-between mb-8 gap-6">
          <div className="flex items-center gap-4 self-start md:self-auto">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-[#458B73] to-teal-400 rounded-2xl blur opacity-40 group-hover:opacity-60 transition-opacity" />
              <img src="/logo.png" alt="Kasaku" className="relative w-12 h-12 rounded-2xl shadow-2xl" />
            </div>
            <div>
              <p className="text-sm text-neutral-400 font-medium">Selamat datang kembali,</p>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{userName}</h1>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
            <div className="flex gap-2">
              <button onClick={() => { setTxModalTab("CATEGORY"); setIsTxModalOpen(true); }} className="p-3 rounded-xl bg-[#252525] border border-white/5 hover:bg-[#333] transition-colors text-xl" title="Kategori">📁</button>
              <button onClick={() => setIsImportModalOpen(true)} className="p-3 rounded-xl bg-[#252525] border border-white/5 hover:bg-[#333] transition-colors text-xl" title="Import">📥</button>
              <button onClick={() => router.push('/donasi')} className="p-3 rounded-xl bg-[#FFD150]/10 border border-[#FFD150]/20 hover:bg-[#FFD150]/20 transition-colors text-xl" title="Donasi">🎁</button>
            </div>
            <AccountMenu />
          </div>
        </header>

        {/* ===== BENTO GRID LAYOUT ===== */}
        <div className="grid grid-cols-12 gap-6">

          {/* 1. FINANCIAL OVERVIEW - Row 1 (Col 1-8) */}
          <div className="col-span-12 lg:col-span-8 p-6 lg:p-8 rounded-3xl bg-[#252525] border border-white/5 shadow-xl relative overflow-hidden group flex flex-col justify-between h-[400px]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#458B73]/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

            <div className="relative z-10 flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm text-neutral-400 font-medium">Total Balance</p>
                  <button onClick={toggleHideSaldo} className="text-neutral-500 hover:text-white transition-colors text-xs">{hideSaldo ? "Show" : "Hide"}</button>
                </div>
                <h3 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">{censor(currency(totals.balance))}</h3>
                <div className="flex gap-4 text-sm font-medium pt-3">
                  <span className="text-[#458B73] flex items-center gap-1 bg-[#458B73]/10 px-2 py-0.5 rounded-lg border border-[#458B73]/20">
                    ↓ {censor(currency(totals.totalIncome))}
                  </span>
                  <span className="text-[#F26076] flex items-center gap-1 bg-[#F26076]/10 px-2 py-0.5 rounded-lg border border-[#F26076]/20">
                    ↑ {censor(currency(totals.totalExpense))}
                  </span>
                </div>
              </div>
            </div>

            {/* Line Chart Area */}
            <div className="flex-1 w-full relative min-h-[160px]">
              <Line
                data={{
                  labels: charts.labels,
                  datasets: [
                    {
                      label: "Pemasukan",
                      data: charts.incomeLine,
                      borderColor: "#458B73",
                      backgroundColor: (context) => {
                        const ctx = context.chart.ctx;
                        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                        gradient.addColorStop(0, "rgba(69,139,115,0.2)");
                        gradient.addColorStop(1, "rgba(69,139,115,0)");
                        return gradient;
                      },
                      tension: 0.4,
                      borderWidth: 3,
                      pointRadius: 0,
                      fill: true
                    },
                    {
                      label: "Pengeluaran",
                      data: charts.expenseLine,
                      borderColor: "#F26076",
                      backgroundColor: (context) => {
                        const ctx = context.chart.ctx;
                        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                        gradient.addColorStop(0, "rgba(242,96,118,0.2)");
                        gradient.addColorStop(1, "rgba(242,96,118,0)");
                        return gradient;
                      },
                      tension: 0.4,
                      borderWidth: 3,
                      pointRadius: 0,
                      fill: true
                    },
                  ],
                }}
                options={{
                  maintainAspectRatio: false,
                  responsive: true,
                  plugins: {
                    legend: { display: false },
                    tooltip: { mode: 'index', intersect: false }
                  },
                  scales: {
                    y: { display: false },
                    x: { display: false }
                  }
                }}
              />
            </div>
          </div>

          {/* 2. ACTIONS & DATE FILTER - Row 1 (Col 9-12) */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
            <button onClick={() => { setEditingTx(null); setTxModalTab("TRANSACTION"); setIsTxModalOpen(true); }}
              className="w-full py-6 rounded-3xl bg-[#458B73] hover:bg-[#3d7a65] text-white font-bold text-lg shadow-lg hover:shadow-[#458B73]/30 transition-all flex items-center justify-center gap-3 group h-[120px]">
              <span className="text-3xl bg-white/20 w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">+</span>
              <span className="text-xl">Catat Transaksi</span>
            </button>

            <div className="flex-1 p-6 rounded-3xl bg-[#252525] border border-white/5 shadow-lg flex flex-col justify-center gap-4 h-[256px]">
              {/* Date Filter Logic */}
              <div>
                <h4 className="text-lg font-bold text-white mb-2 ml-1">Filter Waktu</h4>
                <div className="flex bg-black/40 p-1 rounded-xl">
                  <button onClick={() => { setDateFilterMode("MONTHLY"); if (searchParams.has('start')) { updateMonthYear(new Date().getMonth() + 1, new Date().getFullYear()); } }}
                    className={`flex-1 py-3 text-xs rounded-lg font-bold transition-all ${dateFilterMode === "MONTHLY" ? "bg-[#333] text-white shadow" : "text-neutral-500 hover:text-white"}`}>Bulanan</button>
                  <button onClick={() => setDateFilterMode("CUSTOM")}
                    className={`flex-1 py-3 text-xs rounded-lg font-bold transition-all ${dateFilterMode === "CUSTOM" ? "bg-[#333] text-white shadow" : "text-neutral-500 hover:text-white"}`}>Kustom</button>
                </div>
              </div>

              {dateFilterMode === "MONTHLY" ? (
                <div className="flex flex-col gap-3">
                  <select className="flex-1 border border-white/10 rounded-xl px-4 py-3 text-base bg-black/20 text-white focus:outline-none focus:ring-1 focus:ring-[#458B73] appearance-none cursor-pointer" value={selectedMonth} onChange={(e) => updateMonthYear(Number(e.target.value), selectedYear)}>
                    {monthOptions.map((m) => (<option key={m} value={m} className="bg-[#252525]">{monthLabel(m)}</option>))}
                  </select>
                  <select className="flex-1 border border-white/10 rounded-xl px-4 py-3 text-base bg-black/20 text-white focus:outline-none focus:ring-1 focus:ring-[#458B73] appearance-none cursor-pointer" value={selectedYear} onChange={(e) => updateMonthYear(selectedMonth, Number(e.target.value))}>
                    {yearOptions.map((y) => (<option key={y} value={y} className="bg-[#252525]">{y}</option>))}
                  </select>
                </div>
              ) : <DateRangePicker startDate={dateRange.start} endDate={dateRange.end} firstTxDate={firstTxDate} onApply={updateCustomRange} />}
            </div>
          </div>

          {/* 3. WALLET DISTRIBUTION - Row 2 (Col 1-4) */}
          <div className="col-span-12 lg:col-span-4 p-6 rounded-3xl bg-[#252525] border border-white/5 shadow-lg relative h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-white text-lg">Wallet Distribution</h3>
              <button onClick={() => setIsWalletDistOpen(true)} className="text-[#458B73] hover:text-white transition-colors text-xs font-bold uppercase">Atur</button>
            </div>

            <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 flex-1 flex flex-col justify-center">
              {wallets && wallets.length > 0 ? wallets.map(w => {
                const percentage = totals.balance > 0 ? (w.initialBalance / totals.balance) * 100 : 0;
                return (
                  <div key={w.id} className="group">
                    <div className="flex justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${w.type === "CASH" ? "bg-[#458B73]" : w.type === "BANK" ? "bg-blue-500" : "bg-purple-500"}`} />
                        <span className="text-sm text-neutral-300 font-semibold">{w.name}</span>
                      </div>
                      <span className="text-sm font-bold text-white">{censor(currency(w.initialBalance))}</span>
                    </div>
                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${w.type === "CASH" ? "bg-[#458B73]" : w.type === "BANK" ? "bg-blue-500" : "bg-purple-500"}`} style={{ width: `${Math.min(percentage, 100)}%` }}></div>
                    </div>
                  </div>
                );
              }) : <p className="text-neutral-500 italic text-sm">Belum ada wallet</p>}
            </div>
          </div>

          {/* 4. DUAL ANALYSIS (INCOME & EXPENSE) - Row 2 (Col 5-12) */}
          <div className="col-span-12 lg:col-span-8 p-6 rounded-3xl bg-[#252525] border border-white/5 shadow-lg h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-lg">Financial Analysis</h3>
            </div>

            <div className="flex-1 min-h-0">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 h-full items-center">
                {/* INCOME CHART */}
                <div className="flex flex-col items-center justify-center relative p-2">
                  <h4 className="text-[10px] md:text-sm font-bold text-[#458B73] mb-3">Pemasukan</h4>
                  <div className="relative w-24 h-24 sm:w-32 sm:h-32 xl:w-40 xl:h-40">
                    <Doughnut
                      data={{
                        labels: charts.incomePie.labels,
                        datasets: [{
                          data: charts.incomePie.data,
                          backgroundColor: PIE_COLORS_INCOME,
                          borderWidth: 0,
                        }]
                      }}
                      plugins={[centerTextPlugin]}
                      options={{
                        cutout: "70%",
                        plugins: {
                          legend: { display: false },
                          tooltip: { enabled: true },
                          centerText: {
                            text: censor(formatCompactNumber(totals.totalIncome)),
                            subtext: "Total"
                          }
                        } as any,
                        maintainAspectRatio: true,
                        responsive: true
                      }}
                    />
                  </div>
                </div>

                {/* INCOME LIST */}
                <div className="flex flex-col justify-center h-full max-h-[140px] sm:max-h-[180px] lg:max-h-full overflow-y-auto custom-scrollbar pr-2 mt-2">
                  {charts.incomePie.labels.map((label, idx) => (
                    <div key={idx} className="flex items-center justify-between mb-2 text-[10px] sm:text-xs">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS_INCOME[idx % PIE_COLORS_INCOME.length] }}></div>
                        <span className="text-neutral-300 truncate">{label}</span>
                      </div>
                      <span className="font-bold text-white ml-2 whitespace-nowrap">{censor(currency(charts.incomePie.data[idx]))}</span>
                    </div>
                  ))}
                  {charts.incomePie.labels.length === 0 && <p className="text-neutral-500 text-[10px] italic text-center">Data kosong</p>}
                </div>

                {/* EXPENSE CHART */}
                <div className="flex flex-col items-center justify-center relative p-2 border-l border-white/5">
                  <h4 className="text-[10px] md:text-sm font-bold text-[#F26076] mb-3">Pengeluaran</h4>
                  <div className="relative w-24 h-24 sm:w-32 sm:h-32 xl:w-40 xl:h-40">
                    <Doughnut
                      data={{
                        labels: charts.expensePie.labels,
                        datasets: [{
                          data: charts.expensePie.data,
                          backgroundColor: PIE_COLORS_EXPENSE,
                          borderWidth: 0,
                        }]
                      }}
                      plugins={[centerTextPlugin]}
                      options={{
                        cutout: "70%",
                        plugins: {
                          legend: { display: false },
                          tooltip: { enabled: true },
                          centerText: {
                            text: censor(formatCompactNumber(totals.totalExpense)),
                            subtext: "Total"
                          }
                        } as any,
                        maintainAspectRatio: true,
                        responsive: true
                      }}
                    />
                  </div>
                </div>

                {/* EXPENSE LIST */}
                <div className="flex flex-col justify-center h-full max-h-[140px] sm:max-h-[180px] lg:max-h-full overflow-y-auto custom-scrollbar pr-2 mt-2">
                  {charts.expensePie.labels.map((label, idx) => (
                    <div key={idx} className="flex items-center justify-between mb-2 text-[10px] sm:text-xs">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS_EXPENSE[idx % PIE_COLORS_EXPENSE.length] }}></div>
                        <span className="text-neutral-300 truncate">{label}</span>
                      </div>
                      <span className="font-bold text-white ml-2 whitespace-nowrap">{censor(currency(charts.expensePie.data[idx]))}</span>
                    </div>
                  ))}
                  {charts.expensePie.labels.length === 0 && <p className="text-neutral-500 text-[10px] italic text-center">Data kosong</p>}
                </div>
              </div>
            </div>
          </div>

          {/* 5. BOTTOM SECTION - Row 3 */}

          {/* LEFT: TRANSACTION HISTORY (Full Height) */}
          <div className="col-span-12 lg:col-span-6 p-6 rounded-3xl bg-[#252525] border border-white/5 shadow-lg flex flex-col h-[600px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-xl text-white">Riwayat Transaksi</h3>
              <div className="flex gap-2">
                <select className="bg-black/20 text-white text-xs border border-white/10 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#458B73] appearance-none cursor-pointer" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)}>
                  <option value="ALL" className="bg-[#252525]">Semua</option><option value="INCOME" className="bg-[#252525]">Masuk</option><option value="EXPENSE" className="bg-[#252525]">Keluar</option>
                </select>
              </div>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-2">
              {filteredTransactions.slice((txPage - 1) * ITEMS_PER_PAGE, txPage * ITEMS_PER_PAGE).map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-2xl bg-black/20 hover:bg-white/5 border border-transparent hover:border-white/5 group transition-all mb-1">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0 ${t.type === 'INCOME' ? 'bg-[#458B73]/20 text-[#458B73]' : 'bg-[#F26076]/20 text-[#F26076]'}`}>
                      {t.type === 'INCOME' ? '↓' : '↑'}
                    </div>
                    <div className="min-w-0">
                      {/* Font size increased for Category */}
                      <p className="font-bold text-sm text-white truncate max-w-[140px]">{t.category}</p>
                      {/* Font size increased for Date */}
                      <span className="text-xs text-neutral-400">{t.date}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-2">
                    {/* Font size increased for Amount */}
                    <span className={`font-bold text-sm whitespace-nowrap ${t.type === 'INCOME' ? 'text-[#458B73]' : 'text-[#F26076]'}`}>
                      {t.type === 'INCOME' ? "+" : "-"}{currency(t.amount)}
                    </span>
                    <button onClick={() => { setEditingTx(t); setTxModalTab("TRANSACTION"); setIsTxModalOpen(true); }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded text-neutral-400 text-[10px]">✏️</button>
                    <button onClick={() => handleDeleteTransaction(t.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded text-neutral-400 hover:text-red-500 text-[10px]">🗑️</button>
                  </div>
                </div>
              ))}
              {filteredTransactions.length === 0 && <div className="text-center py-10 text-neutral-500 italic">Tidak ada transaksi.</div>}
            </div>
            {filteredTransactions.length > ITEMS_PER_PAGE && (
              <div className="flex justify-between items-center pt-2 mt-2 border-t border-white/5 text-xs">
                <button onClick={() => setTxPage(p => Math.max(1, p - 1))} disabled={txPage === 1} className="px-3 py-1.5 rounded bg-[#333] hover:bg-[#444] disabled:opacity-50 transition-colors font-medium">← Prev</button>
                <span className="text-neutral-500">{txPage} / {Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE)}</span>
                <button onClick={() => setTxPage(p => Math.min(Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE), p + 1))} disabled={txPage === Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE)} className="px-3 py-1.5 rounded bg-[#333] hover:bg-[#444] disabled:opacity-50 transition-colors font-medium">Next →</button>
              </div>
            )}
          </div>

          {/* RIGHT: GRID (Goals, Budget, Recurring, Debt) - Stacked Mobile, 2x2 Desktop */}
          <div className="col-span-12 lg:col-span-6 grid grid-cols-1 md:grid-cols-2 gap-4 h-full md:h-[600px]">

            {/* 1. TARGET (Goals) */}
            <div className="p-4 rounded-3xl bg-[#252525] border border-white/5 shadow-lg relative overflow-hidden flex flex-col h-[200px] md:h-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white text-lg flex items-center gap-2">🎯 Target</h3>
                <button onClick={() => { setEditingGoal(null); setIsGoalCreateOpen(true); }} className="text-xs p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white font-bold transition-colors">+</button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                {goals.map(g => {
                  const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
                  return (
                    <div key={g.id} onClick={() => { setEditingGoal(g); setIsGoalCreateOpen(true); }} className="p-3 rounded-xl bg-black/20 hover:bg-white/5 cursor-pointer">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-bold text-gray-200">{g.name}</span>
                        <span className="text-[10px] text-[#458B73] font-bold bg-[#458B73]/10 px-2 py-0.5 rounded-full">{pct}%</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2 mb-1">
                        <div className="h-2 rounded-full bg-[#458B73] transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-neutral-400">
                        <span>{currency(g.currentAmount)}</span>
                      </div>
                    </div>
                  );
                })}
                {goals.length === 0 && <p className="text-neutral-500 text-[10px] text-center mt-4">Kosong</p>}
              </div>
            </div>

            {/* 2. BUDGET */}
            <div className="p-4 rounded-3xl bg-[#252525] border border-white/5 shadow-lg relative overflow-hidden flex flex-col h-[200px] md:h-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white text-lg flex items-center gap-2">📊 Budget</h3>
                <button onClick={() => { setEditingBudget(null); setIsBudgetModalOpen(true); }} className="text-xs p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white font-bold transition-colors">+</button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                {budgets.map((b) => (
                  <div key={b.id} onClick={() => { setEditingBudget({ categoryId: b.categoryId, limitAmount: b.limitAmount, id: b.id, period: b.period }); setIsBudgetModalOpen(true); }}
                    className="cursor-pointer hover:bg-white/5 p-1 rounded-lg transition-colors">
                    <BudgetProgress id={b.id} categoryName={b.categoryName} limit={b.limitAmount} spent={spentByCategory[b.categoryName] || 0} period={b.period} onEdit={() => { }} compact={true} />
                  </div>
                ))}
                {budgets.length === 0 && <p className="text-neutral-500 text-[10px] text-center mt-4">Kosong</p>}
              </div>
            </div>

            {/* 3. RECURRING */}
            <div className="p-4 rounded-3xl bg-[#252525] border border-white/5 shadow-lg relative overflow-hidden flex flex-col h-[200px] md:h-auto">
              <div className="flex items-center justify-between mb-4 leading-none">
                <h3 className="font-bold text-white text-lg flex items-center gap-2">🔄 Rutinitas</h3>
                <button onClick={() => setIsRecurringModalOpen(true)} className="text-xs p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white font-bold transition-colors">+</button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                <RecurringManager categories={categoryObjects} wallets={wallets || []} compact={true} />
              </div>
            </div>

            {/* 4. DEBT */}
            <div className="p-4 rounded-3xl bg-[#252525] border border-white/5 shadow-lg flex flex-col h-[200px] md:h-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-white text-lg">{loanTab === "PAYABLE" ? "Hutang" : "Piutang"}</h3>
                <div className="flex items-center gap-2">
                  <div className="flex bg-black/40 rounded p-1">
                    <button onClick={() => setLoanTab("PAYABLE")} className={`px-2.5 py-1 text-[10px] font-bold rounded flex items-center justify-center min-w-[28px] transition-colors ${loanTab === "PAYABLE" ? "bg-[#F26076] text-white" : "text-neutral-500 hover:text-white"}`}>H</button>
                    <button onClick={() => setLoanTab("RECEIVABLE")} className={`px-2.5 py-1 text-[10px] font-bold rounded flex items-center justify-center min-w-[28px] transition-colors ${loanTab === "RECEIVABLE" ? "bg-[#458B73] text-white" : "text-neutral-500 hover:text-white"}`}>P</button>
                  </div>
                  <button onClick={() => { setEditingLoan(null); setIsLoanModalOpen(true); }} className="text-xs p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white font-bold transition-colors">+</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                {(loanTab === "PAYABLE" ? payableLoans : receivableLoans).map(l => (
                  <div key={l.id} className="p-2.5 rounded-xl bg-black/20 border border-white/5 hover:bg-white/5 transition-all group relative">
                    <div className="flex justify-between items-start mb-1">
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="font-bold text-xs text-white truncate">{l.name}</p>
                        {l.dueDate && (
                          <p className="text-[10px] text-neutral-400 font-medium">Jatuh Tempo: {new Date(l.dueDate).toLocaleDateString("id-ID", { day: 'numeric', month: 'short' })}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-xs ${loanTab === "PAYABLE" ? "text-[#F26076]" : "text-[#458B73]"}`}>
                          {currency(l.remaining)}
                        </p>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-1 mt-1">
                          <button onClick={() => { setEditingLoan(l); setIsLoanModalOpen(true); }} className="p-1 hover:bg-white/10 rounded text-[#FF9760] text-[10px]">✏️</button>
                          <button onClick={() => handleDeleteLoan(l.id)} className="p-1 hover:bg-white/10 rounded text-[#F26076] text-[10px]">🗑️</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {(loanTab === "PAYABLE" ? payableLoans : receivableLoans).length === 0 && <p className="text-neutral-500 text-[10px] text-center mt-4">Kosong</p>}
              </div>
            </div>

          </div>

        </div>
      </div>

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

      <Modal isOpen={isRecurringModalOpen} onClose={() => setIsRecurringModalOpen(false)} title="Kelola Rutinitas">
        <RecurringManager categories={categoryObjects} wallets={wallets || []} />
      </Modal>

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import & Ekspor CSV"
        transactions={transactions}
        totalBalance={totals.balance}
      />

      {/* Floating WhatsApp Bot Button */}
      <a
        href="https://wa.me/6285173270427?text=hi"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full bg-[#25D366] text-white font-bold shadow-lg shadow-[#25D366]/30 hover:shadow-[#25D366]/50 hover:scale-105 active:scale-95 transition-all group animate-bounce-in border border-white/20 backdrop-blur-sm"
        title="Chat Bot WhatsApp Kasaku"
      >
        {/* WhatsApp SVG Icon */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 flex-shrink-0">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        {/* Text hidden on small screens */}
        <span className="hidden sm:inline text-sm">Chat Bot WA</span>
        {/* Ping animation */}
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
        </span>
      </a>

    </main>
  );
}
