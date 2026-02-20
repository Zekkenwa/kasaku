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
import Link from "next/link";

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
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("kasaku_hide_saldo");
      if (stored !== null) {
        setHideSaldo(stored === "true");
      }
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

  const payableLoans = loans.filter(l => l.type === "PAYABLE" || !l.type);
  const receivableLoans = loans.filter(l => l.type === "RECEIVABLE");

  return (
    <main className="min-h-screen pb-20 bg-[#1E1E1E] text-white font-sans selection:bg-[#458B73] selection:text-white relative overflow-hidden">
      {/* Background Decoration */}
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#458B73]/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#F26076]/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 px-6 pt-8 pb-4 md:px-12 md:pt-12">
        <header className="flex flex-col md:flex-row items-center justify-between mb-10 gap-6">
          <div className="flex items-center gap-5 self-start md:self-auto group transition-all">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[#458B73] to-emerald-400 rounded-2xl blur-lg opacity-40 group-hover:opacity-60 transition-opacity" />
              <img src="/logo.png" alt="Kasaku" className="relative w-14 h-14 rounded-2xl shadow-2xl border border-white/10" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest mb-1">Beranda Finansial</p>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight flex items-center gap-2">
                Halo, {userName} <span className="text-brand-green">🍃</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end bg-black/20 backdrop-blur-md p-2 rounded-2xl border border-white/5">
            <div className="flex gap-2">
              <Link href="/" className="p-3 rounded-xl hover:bg-white/5 transition-all text-xl grayscale hover:grayscale-0" title="Landing Page">🏠</Link>
              <button onClick={() => setIsCategoryModalOpen(true)} className="p-3 rounded-xl hover:bg-white/5 transition-all text-xl grayscale hover:grayscale-0" title="Kategori">📁</button>
              <button onClick={() => setIsImportModalOpen(true)} className="p-3 rounded-xl hover:bg-white/5 transition-all text-xl grayscale hover:grayscale-0" title="Import">📥</button>
              <Link href='/donasi' className="p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 transition-all text-xl" title="Donasi">🎁</Link>
            </div>
            <div className="w-[1px] h-8 bg-white/10 mx-2" />
            <AccountMenu />
          </div>
        </header>

        <div className="grid grid-cols-12 gap-8">
          {/* 1. FINANCIAL OVERVIEW */}
          <div className="col-span-12 lg:col-span-8 p-8 lg:p-10 rounded-[2.5rem] bg-gradient-to-br from-[#252525] to-[#1a1a1a] border border-white/10 shadow-2xl relative overflow-hidden group flex flex-col justify-between h-[450px]">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#458B73]/20 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none animate-pulse" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-brand-green/20 flex items-center justify-center text-brand-green">💰</div>
                <p className="text-sm text-neutral-400 font-bold uppercase tracking-widest">Saldo Saat Ini</p>
                <button onClick={toggleHideSaldo} className="ml-2 px-2 py-0.5 rounded-md bg-white/5 text-neutral-500 hover:text-white transition-colors text-[10px] uppercase font-bold tracking-tighter">{hideSaldo ? "Lihat" : "Sembunyi"}</button>
              </div>
              <h3 className="text-5xl lg:text-7xl font-black text-white tracking-tighter leading-none mb-6">
                {censor(currency(totals.balance))}
              </h3>
              <div className="flex gap-4 text-sm font-bold pt-3 p-1 rounded-2xl bg-black/20 w-fit">
                <span className="text-[#458B73] flex items-center gap-2 bg-[#458B73]/5 px-4 py-2 rounded-xl">
                  <span className="text-xs">↓</span> {censor(currency(totals.totalIncome))}
                </span>
                <span className="text-[#F26076] flex items-center gap-2 bg-[#F26076]/5 px-4 py-2 rounded-xl">
                  <span className="text-xs">↑</span> {censor(currency(totals.totalExpense))}
                </span>
              </div>
            </div>
            <div className="flex-1 w-full relative min-h-[160px]">
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
                      fill: true
                    },
                  ],
                }}
                options={{ maintainAspectRatio: false, responsive: true, plugins: { legend: { display: false } }, scales: { y: { display: false }, x: { display: false } } }}
              />
            </div>
          </div>

          {/* 2. ACTIONS & DATE FILTER */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
            <button onClick={() => { setEditingTx(null); setIsTxModalOpen(true); }}
              className="w-full py-6 rounded-[2.5rem] bg-gradient-to-br from-[#458B73] to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white font-black text-xl shadow-2xl shadow-emerald-900/40 transition-all flex items-center justify-center gap-4 group h-[140px] relative overflow-hidden">
              <span className="text-3xl bg-white/20 w-12 h-12 rounded-full flex items-center justify-center group-hover:rotate-90 transition-transform duration-500 shadow-inner">+</span>
              <span className="tracking-tight">Catat Transaksi</span>
            </button>

            <div className="flex-1 p-8 rounded-[2.5rem] bg-[#252525] border border-white/10 shadow-xl flex flex-col justify-center gap-6 h-[250px] backdrop-blur-xl relative">
              <div>
                <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3 ml-1">Rentang Waktu</h4>
                <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5">
                  <button onClick={() => setDateFilterMode("MONTHLY")} className={`flex-1 py-3 text-[10px] uppercase tracking-widest rounded-xl font-black transition-all ${dateFilterMode === "MONTHLY" ? "bg-white/10 text-white shadow-lg" : "text-neutral-500 hover:text-white"}`}>Bulanan</button>
                  <button onClick={() => setDateFilterMode("CUSTOM")} className={`flex-1 py-3 text-[10px] uppercase tracking-widest rounded-xl font-black transition-all ${dateFilterMode === "CUSTOM" ? "bg-white/10 text-white shadow-lg" : "text-neutral-500 hover:text-white"}`}>Kustom</button>
                </div>
              </div>
              {dateFilterMode === "MONTHLY" ? (
                <div className="flex gap-3">
                  <select className="flex-1 border border-white/10 rounded-xl px-4 py-3 text-sm bg-black/20 text-white focus:outline-none focus:ring-1 focus:ring-brand-green appearance-none cursor-pointer" value={selectedMonth} onChange={(e) => updateMonthYear(Number(e.target.value), selectedYear)}>
                    {monthOptions.map((m) => (<option key={m} value={m} className="bg-[#252525]">{monthLabel(m)}</option>))}
                  </select>
                  <select className="flex-1 border border-white/10 rounded-xl px-4 py-3 text-sm bg-black/20 text-white focus:outline-none focus:ring-1 focus:ring-brand-green appearance-none cursor-pointer" value={selectedYear} onChange={(e) => updateMonthYear(selectedMonth, Number(e.target.value))}>
                    {yearOptions.map((y) => (<option key={y} value={y} className="bg-[#252525]">{y}</option>))}
                  </select>
                </div>
              ) : <DateRangePicker startDate={dateRange.start} endDate={dateRange.end} firstTxDate={firstTxDate} onApply={updateCustomRange} />}
            </div>
          </div>

          {/* 3. DUAL ANALYSIS (INCOME & EXPENSE) */}
          <div className="col-span-12 p-10 rounded-[2.5rem] bg-[#252525] border border-white/10 shadow-2xl min-h-[450px] flex flex-col relative overflow-hidden backdrop-blur-md">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h4 className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-2">Pantauan Saldo</h4>
                <h3 className="text-3xl font-black text-white tracking-tight">Analisis Keuangan</h3>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 flex-1">
              {/* Income Chart */}
              <div className="flex flex-col items-center justify-center p-6 bg-black/20 rounded-3xl border border-white/5 hover:border-[#458B73]/30 transition-all">
                <h4 className="text-[10px] font-black text-[#458B73] uppercase tracking-widest mb-6">Pemasukan</h4>
                <div className="relative w-36 h-36">
                  <Doughnut data={{ labels: charts.incomePie.labels, datasets: [{ data: charts.incomePie.data, backgroundColor: PIE_COLORS_INCOME, borderWidth: 0 }] }} plugins={[centerTextPlugin]} options={{ cutout: "75%", plugins: { legend: { display: false }, centerText: { text: censor(formatCompactNumber(totals.totalIncome)), subtext: "Total" } } as any, maintainAspectRatio: true }} />
                </div>
              </div>
              {/* Income List */}
              <div className="flex flex-col justify-center h-full max-h-[300px] overflow-y-auto custom-scrollbar pr-3">
                {charts.incomePie.labels.map((label, idx) => (
                  <div key={idx} className="flex items-center justify-between mb-3 group/item">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-lg" style={{ backgroundColor: PIE_COLORS_INCOME[idx % PIE_COLORS_INCOME.length] }}></div>
                      <span className="text-xs text-neutral-400 font-bold truncate group-hover/item:text-white transition-colors">{label}</span>
                    </div>
                    <span className="text-xs font-black text-white ml-2">{censor(currency(charts.incomePie.data[idx]))}</span>
                  </div>
                ))}
              </div>
              {/* Expense Chart */}
              <div className="flex flex-col items-center justify-center p-6 bg-black/20 rounded-3xl border border-white/5 hover:border-[#F26076]/30 transition-all">
                <h4 className="text-[10px] font-black text-[#F26076] uppercase tracking-widest mb-6">Pengeluaran</h4>
                <div className="relative w-36 h-36">
                  <Doughnut data={{ labels: charts.expensePie.labels, datasets: [{ data: charts.expensePie.data, backgroundColor: PIE_COLORS_EXPENSE, borderWidth: 0 }] }} plugins={[centerTextPlugin]} options={{ cutout: "75%", plugins: { legend: { display: false }, centerText: { text: censor(formatCompactNumber(totals.totalExpense)), subtext: "Total" } } as any, maintainAspectRatio: true }} />
                </div>
              </div>
              {/* Expense List */}
              <div className="flex flex-col justify-center h-full max-h-[300px] overflow-y-auto custom-scrollbar pr-3">
                {charts.expensePie.labels.map((label, idx) => (
                  <div key={idx} className="flex items-center justify-between mb-3 group/item">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-lg" style={{ backgroundColor: PIE_COLORS_EXPENSE[idx % PIE_COLORS_EXPENSE.length] }}></div>
                      <span className="text-xs text-neutral-400 font-bold truncate group-hover/item:text-white transition-colors">{label}</span>
                    </div>
                    <span className="text-xs font-black text-white ml-2">{censor(currency(charts.expensePie.data[idx]))}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4. TRANSACTION HISTORY & SMART TOOLS */}
          <div className="col-span-12 lg:col-span-6 p-10 rounded-[2.5rem] bg-[#252525] border border-white/10 shadow-2xl h-[700px] flex flex-col relative overflow-hidden backdrop-blur-md">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h4 className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-2">Log Keuangan</h4>
                <h3 className="text-3xl font-black text-white tracking-tight">Riwayat</h3>
              </div>
              <select className="bg-black/40 text-white text-[10px] font-black uppercase tracking-widest border border-white/10 rounded-xl px-4 py-2 appearance-none cursor-pointer" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)}>
                <option value="ALL" className="bg-[#252525]">Semua</option><option value="INCOME" className="bg-[#252525]">Masuk</option><option value="EXPENSE" className="bg-[#252525]">Keluar</option>
              </select>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
              {filteredTransactions.slice((txPage - 1) * ITEMS_PER_PAGE, txPage * ITEMS_PER_PAGE).map((t) => (
                <div key={t.id} className="flex items-center justify-between p-5 rounded-[2rem] bg-black/20 hover:bg-white/5 border border-transparent hover:border-white/10 group transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm ${t.type === 'INCOME' ? 'bg-[#458B73]/20 text-[#458B73]' : 'bg-[#F26076]/20 text-[#F26076]'}`}>{t.type === 'INCOME' ? '↓' : '↑'}</div>
                    <div>
                      <p className="font-black text-sm text-white truncate max-w-[150px]">{t.category}</p>
                      <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest">{t.date}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`font-black text-sm ${t.type === 'INCOME' ? 'text-brand-green' : 'text-brand-red'}`}>{t.type === 'INCOME' ? '+' : '-'}{currency(t.amount)}</span>
                    <button onClick={() => { setEditingTx(t); setIsTxModalOpen(true); }} className="p-2 hover:bg-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">✏️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-6 flex flex-col gap-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
              {/* Target (Goals) */}
              <div className="p-8 rounded-[2.5rem] bg-[#252525] border border-white/10 shadow-xl flex flex-col group hover:border-[#458B73]/30 transition-all h-[335px]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-black text-white text-lg">🎯 Target</h3>
                  <button onClick={() => { setEditingGoal(null); setIsGoalCreateOpen(true); }} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-brand-green text-white font-black transition-all">+</button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
                  {goals.map(g => {
                    const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
                    return (
                      <div key={g.id} onClick={() => { setEditingGoal(g); setIsGoalCreateOpen(true); }} className="p-4 rounded-2xl bg-black/20 hover:bg-white/5 cursor-pointer border border-transparent hover:border-white/5 transition-all">
                        <div className="flex justify-between mb-2"> <span className="text-xs font-black text-white uppercase tracking-tight">{g.name}</span> <span className="text-[10px] text-brand-green font-black">{pct}%</span> </div>
                        <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden"> <div className="h-full rounded-full bg-brand-green transition-all duration-700" style={{ width: `${pct}%` }} /> </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Anggaran (Budget) */}
              <div className="p-8 rounded-[2.5rem] bg-[#252525] border border-white/10 shadow-xl flex flex-col group hover:border-amber-500/30 transition-all h-[335px]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-black text-white text-lg">📊 Anggaran</h3>
                  <button onClick={() => { setEditingBudget(null); setIsBudgetModalOpen(true); }} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-amber-500 text-white font-black transition-all">+</button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
                  {budgets.map((b) => (<div key={b.id} onClick={() => { setEditingBudget({ categoryId: b.categoryId, limitAmount: b.limitAmount, id: b.id, period: b.period }); setIsBudgetModalOpen(true); }} className="cursor-pointer hover:bg-white/5 p-3 rounded-2xl border border-transparent hover:border-white/5 transition-all"><BudgetProgress id={b.id} categoryName={b.categoryName} limit={b.limitAmount} spent={spentByCategory[b.categoryName] || 0} period={b.period} onEdit={() => { }} compact={true} /></div>))}
                </div>
              </div>
              {/* Rutinitas (Recurring) */}
              <div className="p-8 rounded-[2.5rem] bg-[#252525] border border-white/10 shadow-xl flex flex-col group hover:border-[#F26076]/30 transition-all h-[335px]">
                <div className="flex items-center justify-between mb-6"> <h3 className="font-black text-white text-lg">🔄 Rutinitas</h3> <button onClick={() => setIsRecurringModalOpen(true)} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-brand-red text-white font-black transition-all">+</button> </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar"> <RecurringManager categories={categoryObjects} wallets={wallets || []} compact={true} /> </div>
              </div>
              {/* Pinjaman (Debt) */}
              <div className="p-8 rounded-[2.5rem] bg-[#252525] border border-white/10 shadow-xl flex flex-col group hover:border-indigo-500/30 transition-all h-[335px]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-white text-lg">{loanTab === "PAYABLE" ? "Hutang" : "Piutang"}</h3>
                  <div className="flex bg-black/40 rounded-xl p-1">
                    <button onClick={() => setLoanTab("PAYABLE")} className={`px-3 py-1 text-[10px] font-black rounded-lg ${loanTab === "PAYABLE" ? "bg-brand-red text-white shadow-lg" : "text-neutral-500"}`}>H</button>
                    <button onClick={() => setLoanTab("RECEIVABLE")} className={`px-3 py-1 text-[10px] font-black rounded-lg ${loanTab === "RECEIVABLE" ? "bg-brand-green text-white shadow-lg" : "text-neutral-500"}`}>P</button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
                  {(loanTab === "PAYABLE" ? payableLoans : receivableLoans).map(l => (
                    <div key={l.id} className="p-4 rounded-2xl bg-black/20 border border-white/5 hover:border-white/10 transition-all">
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1"> <p className="font-black text-xs text-white truncate mb-1">{l.name}</p> {l.dueDate && <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">{new Date(l.dueDate).toLocaleDateString("id-ID", { day: 'numeric', month: 'short' })}</p>} </div>
                        <span className={`font-black text-xs ${loanTab === "PAYABLE" ? "text-brand-red" : "text-brand-green"}`}>{currency(l.remaining)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={isTxModalOpen} onClose={() => setIsTxModalOpen(false)} title={editingTx ? "Edit Transaksi" : "Catat Transaksi"}>
        <TransactionForm categoryObjects={categoryObjects} categories={categories} initialData={editingTx} onClose={() => setIsTxModalOpen(false)} wallets={wallets} />
      </Modal>
      <Modal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} title="Kelola Kategori"> <CategoryManager categories={categoryObjects} /> </Modal>
      <Modal isOpen={isLoanModalOpen} onClose={() => setIsLoanModalOpen(false)} title={editingLoan ? "Edit Hutang/Piutang" : (loanTab === "PAYABLE" ? "Tambah Hutang" : "Tambah Piutang")}> <LoanForm initialData={editingLoan} onClose={() => setIsLoanModalOpen(false)} defaultType={loanTab} /> </Modal>
      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Pembayaran Cicilan">
        {activeLoanForPayment && <PaymentForm loanId={activeLoanForPayment.id} loanName={activeLoanForPayment.name} remaining={activeLoanForPayment.remaining} loanType={activeLoanForPayment.type} onClose={() => setIsPaymentModalOpen(false)} />}
      </Modal>
      <Modal isOpen={isBudgetModalOpen} onClose={() => setIsBudgetModalOpen(false)} title="Atur Budget"> <BudgetForm categories={categoryObjects} initialData={editingBudget} onClose={() => setIsBudgetModalOpen(false)} /> </Modal>
      <Modal isOpen={isGoalCreateOpen} onClose={() => setIsGoalCreateOpen(false)} title="Target Tabungan"> <GoalCreateForm onClose={() => setIsGoalCreateOpen(false)} initialData={editingGoal} /> </Modal>
      <Modal isOpen={isWalletDistOpen} onClose={() => setIsWalletDistOpen(false)} title="Atur Pembagian Saldo"> <WalletDistributor wallets={wallets || []} totalBalance={totals.balance} onClose={() => setIsWalletDistOpen(false)} /> </Modal>
      <Modal isOpen={isRecurringModalOpen} onClose={() => setIsRecurringModalOpen(false)} title="Kelola Rutinitas"> <RecurringManager categories={categoryObjects} wallets={wallets || []} /> </Modal>
      <ImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Import & Ekspor CSV" transactions={transactions} totalBalance={totals.balance} />

      {/* Floating WhatsApp Bot Button */}
      <a href="https://wa.me/6285173270427?text=Hallo" target="_blank" rel="noopener noreferrer" className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-6 py-4 rounded-full bg-[#25D366] text-white font-black shadow-2xl shadow-[#25D366]/40 hover:scale-105 transition-all group animate-bounce-in border border-white/20 backdrop-blur-sm">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
        <span className="hidden sm:inline text-xs uppercase font-black tracking-widest">Chat Bot WA</span>
      </a>
    </main>
  );
}
