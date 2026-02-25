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
type Transaction = { id: string; type: TransactionType; category: string; amount: number; note?: string; date: string; walletId?: string; walletName?: string };
type Loan = { id: string; name: string; amount: number; remaining: number; createdAt: string; dueDate?: string; status: "ONGOING" | "PAID"; type: "PAYABLE" | "RECEIVABLE"; payments: { id: string; amount: number; date: string; note?: string }[] };
type Budget = { id: string; categoryId: string; categoryName: string; limitAmount: number; period?: string };
type Wallet = { id: string; name: string; type: "CASH" | "BANK" | "EWALLET"; initialBalance: number };
type Goal = { id: string; name: string; targetAmount: number; currentAmount: number; deadline?: string; notes?: string };
type Engagement = { id: string; currentStreak: number; highestStreak: number; freezeDays: number; healthScore: number; lastLogDate: string | null };
type Badge = { id: string; code: string; name: string; description: string; progress: number; maxProgress: number; isUnlocked: boolean; level: number; earnedAt: string };

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
    incomeWalletPie?: { labels: string[]; data: number[] };
    expenseWalletPie?: { labels: string[]; data: number[] };
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
  engagement: Engagement | null;
  badges: Badge[];
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

// Wallet-specific chart colors to distinguish them from category charts
const PIE_COLORS_INCOME_WALLET = ["#0ea5e9", "#38bdf8", "#7dd3fc", "#bae6fd", "#0284c7"];
const PIE_COLORS_EXPENSE_WALLET = ["#f43f5e", "#fb7185", "#fda4af", "#fecdd3", "#e11d48"];

const BADGE_DEFINITIONS = [
  { code: "STARTER", name: "The Starter", description: "First transaction ever.", maxProgress: 1, level: 1, icon: "🥚" },
  { code: "WEEK_WARRIOR", name: "Week Warrior", description: "7-day streak.", maxProgress: 7, level: 1, icon: "⚔️" },
  { code: "HABIT_BUILDER", name: "Habit Builder", description: "30-day streak.", maxProgress: 30, level: 2, icon: "🛡️" },
  { code: "UNSTOPPABLE", name: "Unstoppable", description: "100-day streak.", maxProgress: 100, level: 3, icon: "👑" },
  { code: "SAVERS_CLUB", name: "Savers Club", description: "First Rp 100.000 saved.", maxProgress: 100000, level: 1, icon: "💰" },
  { code: "MILLIONAIRE_MINDSET", name: "Millionaire Mindset", description: "First Rp 1.000.000 saved.", maxProgress: 1000000, level: 2, icon: "💎" },
  { code: "WHALE", name: "Whale", description: "Balance reaches Rp 10.000.000.", maxProgress: 10000000, level: 3, icon: "🐋" },
  { code: "BUDGET_MASTER", name: "Budget Master", description: "Stay under budget for 1 category.", maxProgress: 1, level: 1, icon: "🎯" },
  { code: "BUDGET_GOD", name: "Budget God", description: "Stay under all budgets for 3 consecutive months.", maxProgress: 3, level: 3, icon: "👼" },
  { code: "DEBT_FREE", name: "Debt Free", description: "Pay off all loans/debts.", maxProgress: 1, level: 2, icon: "🕊️" },
  { code: "TRUSTWORTHY", name: "Trustworthy", description: "Lend money to a friend (Receivable).", maxProgress: 1, level: 1, icon: "🤝" },
  { code: "GOAL_SETTER", name: "Goal Setter", description: "Create your first Goal.", maxProgress: 1, level: 1, icon: "🚀" },
  { code: "GOAL_ACHIEVER", name: "Goal Achiever", description: "Reach 100% on a Goal.", maxProgress: 1, level: 2, icon: "🏁" },
  { code: "CONSISTENT_AUTOMATOR", name: "Consistent Automator", description: "Set up 1 Routine transaction.", maxProgress: 1, level: 1, icon: "⚙️" },
  { code: "BIG_SPENDER", name: "Big Spender", description: "Spend > Rp 1.000.000 in a single expense.", maxProgress: 1000000, level: 2, icon: "💸" },
  { code: "AI_WHISPERER", name: "AI Whisperer", description: "Use the WhatsApp AI for 10 transactions.", maxProgress: 10, level: 2, icon: "🤖" },
  { code: "GENEROUS", name: "Generous", description: "Transfer money 5 times.", maxProgress: 5, level: 1, icon: "🎁" },
  { code: "THE_PLANNER", name: "The Planner", description: "Create budgets for 3+ categories.", maxProgress: 3, level: 1, icon: "📋" },
  { code: "RESILIENT", name: "Resilient", description: "Use a Freeze Day to save a streak.", maxProgress: 1, level: 2, icon: "🧊" },
  { code: "FINANCIAL_GURU", name: "Financial Guru", description: "Reach a Financial Health Score of 90+.", maxProgress: 90, level: 3, icon: "🧘" },
];

export default function DashboardClient({
  userName, categories, transactions, totals, charts, loans, budgets, wallets,
  monthOptions, yearOptions, selectedMonth, selectedYear, categoryObjects, goals, dateRange, firstTxDate, engagement, badges
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();

  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);

  const [activeTooltip, setActiveTooltip] = useState<{
    def: any;
    unlocked: boolean;
    rect: DOMRect;
    isFirst: boolean;
    isLast: boolean;
  } | null>(null);
  const [isGoalCreateOpen, setIsGoalCreateOpen] = useState(false);
  const [isWalletDistOpen, setIsWalletDistOpen] = useState(false);
  const [gamificationPopups, setGamificationPopups] = useState<string[]>([]);
  const [currentPopupIndex, setCurrentPopupIndex] = useState(0);
  const [seenBadges, setSeenBadges] = useState<string[]>([]);

  const [txPage, setTxPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

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
      const storedSeenBadges = localStorage.getItem("kasaku_seen_badges");
      if (storedSeenBadges) {
        try {
          setSeenBadges(JSON.parse(storedSeenBadges));
        } catch (e) {
          console.error("Failed to parse seen badges", e);
        }
      }
      fetch("/api/recurring/process", { method: "POST" }).catch(err => console.error("Auto-process error:", err));
    }
  }, []);

  // Update localStorage when seenBadges changes
  useEffect(() => {
    if (seenBadges.length > 0) {
      localStorage.setItem("kasaku_seen_badges", JSON.stringify(seenBadges));
    }
  }, [seenBadges]);

  // Gamification Popup Auto-dismiss
  useEffect(() => {
    if (gamificationPopups.length > 0 && currentPopupIndex < gamificationPopups.length) {
      const timer = setTimeout(() => {
        if (currentPopupIndex === gamificationPopups.length - 1) {
          setGamificationPopups([]);
          setCurrentPopupIndex(0);
        } else {
          setCurrentPopupIndex(prev => prev + 1);
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [gamificationPopups, currentPopupIndex]);

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
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight flex items-center md:items-end gap-3 flex-wrap">
                <span>Halo, {userName} <span className="text-brand-green">🍃</span></span>
                {engagement && engagement.currentStreak > 0 && (
                  <div title={`${engagement.freezeDays} Freeze Days tersisa`} className="flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500/20 to-rose-500/20 border border-orange-500/30 text-orange-400 font-black text-sm md:text-base shadow-[0_0_20px_rgba(249,115,22,0.15)] mb-1 cursor-default hover:scale-105 transition-transform">
                    <span className="drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]">🔥</span> {engagement.currentStreak} Hari
                  </div>
                )}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end bg-black/20 backdrop-blur-md p-2 rounded-2xl border border-white/5 relative z-50">
            <div className="flex gap-2">
              <Link href="/homepage" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-sm font-bold text-neutral-300 hover:text-white border border-white/5" title="Halaman Depan">
                <span>🏠</span> <span className="hidden sm:inline">Beranda</span>
              </Link>
              <button onClick={() => setIsCategoryModalOpen(true)} className="p-3 rounded-xl hover:bg-white/5 transition-all text-xl grayscale hover:grayscale-0" title="Kategori">📁</button>
              <button onClick={() => setIsImportModalOpen(true)} className="p-3 rounded-xl hover:bg-white/5 transition-all text-xl grayscale hover:grayscale-0" title="Import">📥</button>
              <Link href='/donasi' className="p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 transition-all text-xl" title="Donasi">🎁</Link>
            </div>
            <div className="w-[1px] h-8 bg-white/10 mx-2" />
            <AccountMenu />
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN: MAIN CONTENT (Primary Focus) */}
          <div className="lg:col-span-8 flex flex-col gap-8">

            {/* 1. HERO SECTION (Balance & Quick Action) */}
            <div className="flex flex-col md:flex-row gap-6">
              {/* Balance Card */}
              <div className="flex-1 p-8 lg:p-10 rounded-[2.5rem] bg-gradient-to-br from-[#252525] to-[#1a1a1a] border border-white/10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] relative overflow-hidden group flex flex-col justify-between min-h-[300px]">
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#458B73]/20 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none animate-pulse" />
                <div className="relative z-10 w-full">
                  <div className="flex items-center justify-between mb-4 w-full">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-green/20 border border-brand-green/30 flex items-center justify-center text-brand-green text-lg shadow-lg">💰</div>
                      <p className="text-sm text-neutral-400 font-bold uppercase tracking-widest">Saldo Saat Ini</p>
                    </div>
                    <button onClick={toggleHideSaldo} className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-neutral-400 hover:text-white transition-all text-[10px] uppercase font-bold tracking-tighter backdrop-blur-md">
                      {hideSaldo ? "Lihat" : "Sembunyi"}
                    </button>
                  </div>
                  <h3 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tighter leading-tight mb-2 drop-shadow-2xl break-words whitespace-pre-wrap">
                    {censor(currency(totals.balance))}
                  </h3>

                  {/* Wallet Distribution Ribbon */}
                  {wallets && wallets.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 mt-4 pb-2 pt-1 relative z-20 opacity-90">
                      {wallets.map(w => (
                        <div key={w.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/10 border border-white/5 backdrop-blur-sm">
                          <span className="text-[10px] uppercase font-black tracking-widest text-neutral-400">{w.name}</span>
                          <span className="text-xs font-bold text-white">{censor(currency(w.initialBalance))}</span>
                        </div>
                      ))}
                      <button onClick={() => setIsWalletDistOpen(true)} className="flex items-center justify-center w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 backdrop-blur-sm border border-white/5 text-xs transition-all" title="Atur Saldo dompet">
                        ⚙️
                      </button>
                    </div>
                  )}
                </div>
                {/* Background Chart */}
                <div className="absolute bottom-0 left-0 w-full h-[180px] opacity-60 mix-blend-screen pointer-events-none">
                  <Line
                    data={{
                      labels: charts.labels,
                      datasets: [
                        { data: charts.incomeLine, borderColor: "#458B73", backgroundColor: "rgba(69,139,115,0.1)", tension: 0.4, borderWidth: 2, pointRadius: 0, fill: true },
                        { data: charts.expenseLine, borderColor: "#F26076", backgroundColor: "rgba(242,96,118,0.1)", tension: 0.4, borderWidth: 2, pointRadius: 0, fill: true },
                      ],
                    }}
                    options={{ maintainAspectRatio: false, responsive: true, plugins: { legend: { display: false } }, scales: { y: { display: false }, x: { display: false } } }}
                  />
                </div>
              </div>

              {/* Premium Health Score Widget */}
              <div className="w-full md:w-64 lg:w-80 p-6 lg:p-8 rounded-[2.5rem] bg-gradient-to-br from-[#252525] to-[#1a1a1a] border border-white/10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col items-center justify-center group min-h-[300px]">
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
                <h3 className="text-[11px] font-black text-neutral-400 uppercase tracking-widest absolute top-8 left-8 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Health Score
                </h3>

                <div className="relative w-36 h-36 lg:w-40 lg:h-40 mt-6 flex flex-col items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                    <circle
                      cx="50" cy="50" r="42" fill="transparent"
                      className={`${(engagement?.healthScore ?? 50) >= 80 ? 'stroke-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.5)]' : (engagement?.healthScore ?? 50) >= 50 ? 'stroke-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]' : 'stroke-rose-500 drop-shadow-[0_0_12px_rgba(244,63,94,0.5)]'} transition-all duration-[1500ms] ease-out`}
                      strokeWidth="8"
                      strokeDasharray="264"
                      strokeDashoffset={264 - (264 * (engagement?.healthScore ?? 50)) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="relative z-10 flex flex-col items-center justify-center translate-y-1">
                    <span className="text-4xl lg:text-5xl font-black text-white tracking-tighter drop-shadow-md leading-none">{engagement?.healthScore ?? 50}</span>
                  </div>
                </div>

                <p className="mt-4 text-center text-[11px] font-bold uppercase tracking-widest text-neutral-500 group-hover:text-neutral-400 transition-colors">
                  {(engagement?.healthScore ?? 50) >= 80 ? <span className="text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]">Sangat Sehat</span> :
                    (engagement?.healthScore ?? 50) >= 50 ? <span className="text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]">Cukup Stabil</span> :
                      <span className="text-rose-400 drop-shadow-[0_0_5px_rgba(244,63,94,0.5)]">Perlu Perhatian</span>}
                </p>
              </div>

              {/* Outstanding Primary Action */}
              <button onClick={() => { setEditingTx(null); setIsTxModalOpen(true); }}
                className="w-full md:w-[220px] p-8 rounded-[2.5rem] bg-gradient-to-br from-[#458B73] to-emerald-700 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-[0_20px_40px_-10px_rgba(69,139,115,0.5)] hover:shadow-[0_20px_50px_-10px_rgba(69,139,115,0.7)] hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-4 group relative overflow-hidden border border-white/20">
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay"></div>
                <div className="relative z-10 w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center group-hover:rotate-90 transition-transform duration-500 shadow-xl border border-white/30 text-3xl font-light">+</div>
                <span className="relative z-10 font-black text-lg tracking-tight text-center leading-tight">Catat<br />Transaksi</span>
              </button>
            </div>

            {/* 2. DUAL ANALYSIS (INCOME & EXPENSE SUMMARY) */}
            <div className="flex flex-col md:flex-row gap-6">
              {/* Income Summary */}
              <div className="flex-1 p-8 rounded-[2.5rem] bg-[#1f1f1f]/80 backdrop-blur-xl border border-white/10 shadow-2xl flex items-center gap-6 group hover:border-[#458B73]/40 transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#458B73]/10 rounded-full blur-[50px] pointer-events-none" />
                <div className="relative w-24 h-24 shrink-0">
                  <Doughnut data={{ labels: charts.incomePie.labels, datasets: [{ data: charts.incomePie.data, backgroundColor: PIE_COLORS_INCOME, borderWidth: 0 }] }} options={{ cutout: "75%", plugins: { legend: { display: false } } as any, maintainAspectRatio: true }} />
                </div>
                <div className="flex-1 z-10">
                  <h4 className="flex items-center gap-2 text-[10px] font-black text-[#458B73] uppercase tracking-widest mb-1">
                    <span className="w-5 h-5 flex items-center justify-center bg-[#458B73]/20 rounded-full text-xs">↓</span> Pemasukan
                  </h4>
                  <span className="text-2xl font-black text-white tracking-tight">{censor(currency(totals.totalIncome))}</span>
                </div>
              </div>
              {/* Expense Summary */}
              <div className="flex-1 p-8 rounded-[2.5rem] bg-[#1f1f1f]/80 backdrop-blur-xl border border-white/10 shadow-2xl flex items-center gap-6 group hover:border-[#F26076]/40 transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#F26076]/10 rounded-full blur-[50px] pointer-events-none" />
                <div className="relative w-24 h-24 shrink-0">
                  <Doughnut data={{ labels: charts.expensePie.labels, datasets: [{ data: charts.expensePie.data, backgroundColor: PIE_COLORS_EXPENSE, borderWidth: 0 }] }} options={{ cutout: "75%", plugins: { legend: { display: false } } as any, maintainAspectRatio: true }} />
                </div>
                <div className="flex-1 z-10">
                  <h4 className="flex items-center gap-2 text-[10px] font-black text-[#F26076] uppercase tracking-widest mb-1">
                    <span className="w-5 h-5 flex items-center justify-center bg-[#F26076]/20 rounded-full text-xs">↑</span> Pengeluaran
                  </h4>
                  <span className="text-2xl font-black text-white tracking-tight">{censor(currency(totals.totalExpense))}</span>
                </div>
              </div>
            </div>

            {/* 2.1 WALLET ANALYSIS (METRIK DOMPET) */}
            {charts.incomeWalletPie && charts.expenseWalletPie && (
              <div className="flex flex-col md:flex-row gap-6 mt-6">
                {/* Income Wallet Summary */}
                <div className="flex-1 p-8 rounded-[2.5rem] bg-[#1f1f1f]/80 backdrop-blur-xl border border-white/10 shadow-2xl flex items-center gap-6 group hover:border-[#0ea5e9]/40 transition-all relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#0ea5e9]/10 rounded-full blur-[50px] pointer-events-none" />
                  <div className="relative w-24 h-24 shrink-0">
                    <Doughnut data={{ labels: charts.incomeWalletPie.labels, datasets: [{ data: charts.incomeWalletPie.data, backgroundColor: PIE_COLORS_INCOME_WALLET, borderWidth: 0 }] }} options={{ cutout: "75%", plugins: { legend: { display: false } } as any, maintainAspectRatio: true }} />
                  </div>
                  <div className="flex-1 z-10">
                    <h4 className="flex items-center gap-2 text-[10px] font-black text-[#0ea5e9] uppercase tracking-widest mb-1">
                      <span className="w-5 h-5 flex items-center justify-center bg-[#0ea5e9]/20 rounded-full text-xs">🏦</span> Pemasukan via Dompet
                    </h4>
                    <span className="text-2xl font-black text-white tracking-tight">{censor(currency(totals.totalIncome))}</span>
                  </div>
                </div>
                {/* Expense Wallet Summary */}
                <div className="flex-1 p-8 rounded-[2.5rem] bg-[#1f1f1f]/80 backdrop-blur-xl border border-white/10 shadow-2xl flex items-center gap-6 group hover:border-[#f43f5e]/40 transition-all relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#f43f5e]/10 rounded-full blur-[50px] pointer-events-none" />
                  <div className="relative w-24 h-24 shrink-0">
                    <Doughnut data={{ labels: charts.expenseWalletPie.labels, datasets: [{ data: charts.expenseWalletPie.data, backgroundColor: PIE_COLORS_EXPENSE_WALLET, borderWidth: 0 }] }} options={{ cutout: "75%", plugins: { legend: { display: false } } as any, maintainAspectRatio: true }} />
                  </div>
                  <div className="flex-1 z-10">
                    <h4 className="flex items-center gap-2 text-[10px] font-black text-[#f43f5e] uppercase tracking-widest mb-1">
                      <span className="w-5 h-5 flex items-center justify-center bg-[#f43f5e]/20 rounded-full text-xs">💸</span> Pengeluaran via Dompet
                    </h4>
                    <span className="text-2xl font-black text-white tracking-tight">{censor(currency(totals.totalExpense))}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 2.5 TROPHY ROOM - GAMIFICATION BADGES */}
            <div className="flex flex-col gap-4 relative z-50">
              <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                Trophy Room <span className="text-xl">🏆</span>
              </h3>
              <div className="p-6 md:p-8 rounded-[2.5rem] bg-[#1a1a1a]/80 backdrop-blur-xl border border-white/5 shadow-2xl relative">
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay rounded-[2.5rem] pointer-events-none"></div>
                {/* Move margin outside the scroll container to keep the scrollbar nested correctly, while allowing overflow visual breaks */}
                <div className="relative z-50 w-full overflow-visible">
                  <div
                    className="overflow-x-auto custom-scrollbar pb-6 pr-6 pt-4"
                    onScroll={() => setActiveTooltip(null)}
                  >
                    <div className="flex gap-4 min-w-max items-stretch justify-start pb-4 px-2 pt-2">

                      {BADGE_DEFINITIONS.map((def, i) => {
                        const unlocked = badges.find(b => b.code === def.code && b.isUnlocked);
                        return (
                          <div
                            key={def.code}
                            tabIndex={0}
                            onClick={(e) => {
                              if (activeTooltip?.def.code === def.code) {
                                setActiveTooltip(null);
                              } else {
                                if (unlocked && !seenBadges.includes(def.code)) {
                                  setSeenBadges(prev => [...prev, def.code]);
                                }
                                setActiveTooltip({
                                  def,
                                  unlocked: !!unlocked,
                                  rect: e.currentTarget.getBoundingClientRect(),
                                  isFirst: i === 0,
                                  isLast: i === BADGE_DEFINITIONS.length - 1
                                });
                              }
                            }}
                            onMouseEnter={(e) => {
                              // Only trigger on real mouse hover to avoid mobile double-firing
                              if (window.matchMedia("(hover: hover)").matches) {
                                if (unlocked && !seenBadges.includes(def.code)) {
                                  setSeenBadges(prev => [...prev, def.code]);
                                }
                                setActiveTooltip({
                                  def,
                                  unlocked: !!unlocked,
                                  rect: e.currentTarget.getBoundingClientRect(),
                                  isFirst: i === 0,
                                  isLast: i === BADGE_DEFINITIONS.length - 1
                                });
                              }
                            }}
                            onMouseLeave={() => {
                              if (window.matchMedia("(hover: hover)").matches) {
                                setActiveTooltip(null);
                              }
                            }}
                            onFocus={(e) => {
                              if (window.matchMedia("(hover: hover)").matches) return;
                              if (unlocked && !seenBadges.includes(def.code)) {
                                setSeenBadges(prev => [...prev, def.code]);
                              }
                              setActiveTooltip({
                                def,
                                unlocked: !!unlocked,
                                rect: e.currentTarget.getBoundingClientRect(),
                                isFirst: i === 0,
                                isLast: i === BADGE_DEFINITIONS.length - 1
                              });
                            }}
                            onBlur={() => setActiveTooltip(null)}
                            className={`w-28 flex flex-col items-center justify-start p-4 rounded-3xl transition-all duration-500 ease-out group cursor-pointer relative hover:z-50 focus:z-50 focus:outline-none h-auto self-stretch
                            ${unlocked ? 'bg-gradient-to-br from-white/10 to-white/5 border border-white/20 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.5)] hover:bg-white/10 hover:scale-[1.15] hover:-translate-y-2 focus:bg-white/10 focus:scale-[1.15] focus:-translate-y-2' : 'bg-black/20 border border-white/5 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 focus:grayscale-0 focus:opacity-100'}
                          `}
                          >
                            {unlocked && !seenBadges.includes(def.code) && (
                              <div className="absolute top-2 right-2 w-3.5 h-3.5 rounded-full bg-brand-green animate-pulse border-2 border-[#1a1a1a] z-50"></div>
                            )}
                            <div className={`text-[3.5rem] drop-shadow-2xl transition-all duration-500 ease-in-out origin-center shrink-0 ${unlocked ? 'group-hover:scale-[1.2] group-hover:-translate-y-1 group-focus:scale-[1.2] group-focus:-translate-y-1' : 'opacity-40 brightness-50 contrast-150 saturate-0'}`}>
                              {def.icon}
                            </div>

                            <div className="flex flex-col items-center justify-end w-full flex-1 mt-2">
                              <p className={`text-xs text-center font-bold tracking-tight leading-tight mb-2 ${unlocked ? 'text-white' : 'text-neutral-500'}`}>
                                {def.name}
                              </p>

                              {unlocked ? (
                                <div className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-widest border border-emerald-500/30 w-full text-center mt-auto shrink-0">
                                  Level {def.level}
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-1 text-[9px] font-bold text-neutral-600 uppercase tracking-widest mt-auto shrink-0">
                                  🔒 Terkunci
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. TRANSACTION HISTORY */}
            <div className="p-6 md:p-8 rounded-[2.5rem] bg-[#1a1a1a]/90 backdrop-blur-2xl border border-white/5 shadow-2xl flex flex-col relative overflow-hidden h-[500px] lg:h-[600px]">
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                  <h4 className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-1">Log Keuangan</h4>
                  <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">Riwayat Transaksi</h3>
                </div>
                <div className="flex items-center gap-3 bg-black/40 p-1.5 rounded-2xl border border-white/5">
                  <select className="bg-transparent text-white text-[10px] font-black uppercase tracking-widest px-3 py-2 appearance-none cursor-pointer focus:outline-none" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)}>
                    <option value="ALL" className="bg-[#252525]">Semua</option><option value="INCOME" className="bg-[#252525]">Masuk</option><option value="EXPENSE" className="bg-[#252525]">Keluar</option>
                  </select>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-3 pr-2 relative z-10">
                {filteredTransactions.slice((txPage - 1) * ITEMS_PER_PAGE, txPage * ITEMS_PER_PAGE).map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/10 group transition-all backdrop-blur-md">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl shadow-inner flex items-center justify-center text-lg ${t.type === 'INCOME' ? 'bg-gradient-to-br from-[#458B73]/30 to-[#458B73]/10 text-[#458B73] border border-[#458B73]/20' : 'bg-gradient-to-br from-[#F26076]/30 to-[#F26076]/10 text-[#F26076] border border-[#F26076]/20'}`}>
                        {t.type === 'INCOME' ? '↓' : '↑'}
                      </div>
                      <div>
                        <p className="font-black text-sm md:text-base text-white truncate max-w-[120px] md:max-w-[200px]">{t.category}</p>
                        <span className="text-[10px] text-neutral-500 font-bold tracking-widest flex items-center gap-1.5 mt-0.5">
                          <span className="uppercase">{t.date}</span>
                          <span className="w-1 h-1 rounded-full bg-neutral-600"></span>
                          <span className="truncate max-w-[80px] md:max-w-[120px] text-neutral-400">via {t.walletName || "Saldo utama"}</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className={`block font-black text-sm md:text-base ${t.type === 'INCOME' ? 'text-brand-green' : 'text-brand-red'}`}>{t.type === 'INCOME' ? '+' : '-'}{currency(t.amount)}</span>
                        {t.note && <span className="text-[10px] text-neutral-500 font-medium truncate max-w-[100px] hidden sm:block">{t.note}</span>}
                      </div>
                      <button onClick={() => { setEditingTx(t); setIsTxModalOpen(true); }} className="w-8 h-8 flex items-center justify-center bg-black/40 hover:bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-all border border-white/10 text-xs">✏️</button>
                    </div>
                  </div>
                ))}
                {filteredTransactions.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-neutral-500">
                    <span className="text-4xl mb-4 opacity-50">📂</span>
                    <p className="font-bold text-sm">Belum ada transaksi</p>
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {filteredTransactions.length > ITEMS_PER_PAGE && (
                <div className="relative z-10 flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                  <button
                    onClick={() => setTxPage(p => Math.max(1, p - 1))}
                    disabled={txPage === 1}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold disabled:opacity-30 transition-all border border-white/5 flex items-center gap-1"
                  >
                    ← <span className="hidden sm:inline">Prev</span>
                  </button>
                  <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar max-w-[150px] md:max-w-[300px] px-2 py-1">
                    {Array.from({ length: Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE) }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setTxPage(i + 1)}
                        className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all border ${txPage === i + 1 ? 'bg-[#458B73]/20 text-[#458B73] border-[#458B73]/30' : 'bg-transparent text-neutral-500 hover:text-white border-transparent hover:border-white/10'}`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setTxPage(p => Math.min(Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE), p + 1))}
                    disabled={txPage === Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE)}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold disabled:opacity-30 transition-all border border-white/5 flex items-center gap-1"
                  >
                    <span className="hidden sm:inline">Next</span> →
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: SMART TOOLS (Secondary Focus) */}
          <div className="lg:col-span-4 flex flex-col gap-6">

            {/* Filter Waktu */}
            <div className="p-6 rounded-[2rem] bg-[#252525]/80 backdrop-blur-xl border border-white/10 shadow-xl flex flex-col gap-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[40px] pointer-events-none" />
              <div className="relative z-10">
                <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="text-base">📅</span> Waktu
                </h4>
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 mb-4">
                  <button onClick={() => setDateFilterMode("MONTHLY")} className={`flex-1 py-2 text-[10px] uppercase tracking-widest rounded-lg font-black transition-all ${dateFilterMode === "MONTHLY" ? "bg-white/10 text-white shadow-md" : "text-neutral-500 hover:text-white"}`}>Bulanan</button>
                  <button onClick={() => setDateFilterMode("CUSTOM")} className={`flex-1 py-2 text-[10px] uppercase tracking-widest rounded-lg font-black transition-all ${dateFilterMode === "CUSTOM" ? "bg-white/10 text-white shadow-md" : "text-neutral-500 hover:text-white"}`}>Kustom</button>
                </div>
                {dateFilterMode === "MONTHLY" ? (
                  <div className="flex gap-2">
                    <select className="flex-1 border border-white/10 rounded-xl px-3 py-2 text-xs bg-black/20 text-white focus:outline-none focus:ring-1 focus:ring-brand-green appearance-none cursor-pointer" value={selectedMonth} onChange={(e) => updateMonthYear(Number(e.target.value), selectedYear)}>
                      {monthOptions.map((m) => (<option key={m} value={m} className="bg-[#252525]">{monthLabel(m)}</option>))}
                    </select>
                    <select className="flex-1 border border-white/10 rounded-xl px-3 py-2 text-xs bg-black/20 text-white focus:outline-none focus:ring-1 focus:ring-brand-green appearance-none cursor-pointer" value={selectedYear} onChange={(e) => updateMonthYear(selectedMonth, Number(e.target.value))}>
                      {yearOptions.map((y) => (<option key={y} value={y} className="bg-[#252525]">{y}</option>))}
                    </select>
                  </div>
                ) : <DateRangePicker startDate={dateRange.start} endDate={dateRange.end} firstTxDate={firstTxDate} onApply={updateCustomRange} />}
              </div>
            </div>

            <div className="flex items-center gap-3 mt-2 mb-1 px-2">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Smart Tools</span>
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            </div>

            {/* Target (Goals) */}
            <div className="p-6 rounded-[2rem] bg-[#252525]/60 backdrop-blur-md border border-white/5 shadow-lg flex flex-col group hover:bg-[#252525]/80 hover:border-[#458B73]/30 transition-all max-h-[250px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-white text-sm flex items-center gap-2"><span className="text-[#458B73]">🎯</span> Target</h3>
                <button onClick={() => { setEditingGoal(null); setIsGoalCreateOpen(true); }} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-brand-green text-white font-black transition-all text-xs">+</button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                {goals.map(g => {
                  const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
                  return (
                    <div key={g.id} onClick={() => { setEditingGoal(g); setIsGoalCreateOpen(true); }} className="p-3 rounded-xl bg-black/20 hover:bg-white/10 cursor-pointer border border-transparent hover:border-white/5 transition-all">
                      <div className="flex justify-between mb-2"> <span className="text-[10px] font-black text-white uppercase tracking-tight">{g.name}</span> <span className="text-[10px] text-brand-green font-black">{pct}%</span> </div>
                      <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden"> <div className="h-full rounded-full bg-brand-green" style={{ width: `${pct}%` }} /> </div>
                    </div>
                  );
                })}
                {goals.length === 0 && <p className="text-[10px] text-center text-neutral-500 py-4 font-bold">Belum ada target</p>}
              </div>
            </div>

            {/* Anggaran (Budget) */}
            <div className="p-6 rounded-[2rem] bg-[#252525]/60 backdrop-blur-md border border-white/5 shadow-lg flex flex-col group hover:bg-[#252525]/80 hover:border-amber-500/30 transition-all max-h-[250px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-white text-sm flex items-center gap-2"><span className="text-amber-500">📊</span> Anggaran</h3>
                <button onClick={() => { setEditingBudget(null); setIsBudgetModalOpen(true); }} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-amber-500 text-white font-black transition-all text-xs">+</button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                {budgets.map((b) => (<div key={b.id} onClick={() => { setEditingBudget({ categoryId: b.categoryId, limitAmount: b.limitAmount, id: b.id, period: b.period }); setIsBudgetModalOpen(true); }} className="cursor-pointer hover:bg-white/10 p-2 rounded-xl transition-all"><BudgetProgress id={b.id} categoryName={b.categoryName} limit={b.limitAmount} spent={spentByCategory[b.categoryName] || 0} period={b.period} onEdit={() => { }} compact={true} /></div>))}
                {budgets.length === 0 && <p className="text-[10px] text-center text-neutral-500 py-4 font-bold">Belum ada anggaran</p>}
              </div>
            </div>

            {/* Rutinitas (Recurring) */}
            <div className="p-6 rounded-[2rem] bg-[#252525]/60 backdrop-blur-md border border-white/5 shadow-lg flex flex-col group hover:bg-[#252525]/80 hover:border-[#F26076]/30 transition-all max-h-[250px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-white text-sm flex items-center gap-2"><span className="text-[#F26076]">🔄</span> Rutinitas</h3>
                <button onClick={() => setIsRecurringModalOpen(true)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-brand-red text-white font-black transition-all text-xs">+</button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <RecurringManager categories={categoryObjects} wallets={wallets || []} compact={true} />
              </div>
            </div>

            {/* Pinjaman (Debt) */}
            <div className="p-6 rounded-[2rem] bg-[#252525]/60 backdrop-blur-md border border-white/5 shadow-lg flex flex-col group hover:bg-[#252525]/80 hover:border-indigo-500/30 transition-all max-h-[300px]">
              <div className="flex justify-between items-center mb-4 gap-2">
                <h3 className="font-black text-white text-sm flex items-center gap-2 whitespace-nowrap"><span className="text-indigo-400">🤝</span> {loanTab === "PAYABLE" ? "Hutang" : "Piutang"}</h3>
                <div className="flex bg-black/40 rounded-lg p-1 shrink-0">
                  <button onClick={() => setLoanTab("PAYABLE")} className={`px-2 py-1 text-[8px] font-black uppercase tracking-widest rounded-md ${loanTab === "PAYABLE" ? "bg-brand-red text-white shadow" : "text-neutral-500 hover:text-white"}`}>Hutang</button>
                  <button onClick={() => setLoanTab("RECEIVABLE")} className={`px-2 py-1 text-[8px] font-black uppercase tracking-widest rounded-md ${loanTab === "RECEIVABLE" ? "bg-brand-green text-white shadow" : "text-neutral-500 hover:text-white"}`}>Piutang</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                {(loanTab === "PAYABLE" ? payableLoans : receivableLoans).map(l => (
                  <div key={l.id} className="p-3 rounded-xl bg-black/20 hover:bg-white/10 border border-transparent hover:border-white/5 transition-all text-left">
                    <div className="flex flex-col">
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-black text-[11px] text-white truncate pr-2">{l.name}</p>
                        <span className={`font-black text-[11px] shrink-0 ${loanTab === "PAYABLE" ? "text-brand-red" : "text-brand-green"}`}>{currency(l.remaining)}</span>
                      </div>
                      {l.dueDate && <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest">{new Date(l.dueDate).toLocaleDateString("id-ID", { day: 'numeric', month: 'short' })}</p>}
                    </div>
                  </div>
                ))}
                {(loanTab === "PAYABLE" ? payableLoans : receivableLoans).length === 0 && <p className="text-[10px] text-center text-neutral-500 py-4 font-bold">Bersih! Tidak ada penagihan.</p>}
              </div>
            </div>

          </div>
        </div>
      </div>

      <Modal isOpen={isTxModalOpen} onClose={() => setIsTxModalOpen(false)} title={editingTx ? "Edit Transaksi" : "Catat Transaksi"}>
        <TransactionForm
          categoryObjects={categoryObjects}
          categories={categories}
          initialData={editingTx}
          onClose={() => setIsTxModalOpen(false)}
          wallets={wallets}
          onSuccess={(gamification) => {
            if (gamification?.unlockedMessages && gamification.unlockedMessages.length > 0) {
              setGamificationPopups(gamification.unlockedMessages);
              setCurrentPopupIndex(0);
            }
          }}
        />
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
      <a href="https://wa.me/6285173270427?text=Hallo" target="_blank" rel="noopener noreferrer" className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-6 py-4 rounded-full bg-[#25D366] text-white font-black shadow-2xl shadow-[#25D366]/40 hover:scale-105 transition-all group animate-bounce-in border border-white/20 backdrop-blur-sm">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
        <span className="hidden sm:inline text-xs uppercase font-black tracking-widest">Chat Bot WA</span>
      </a>

      {/* Global Tooltip Portal for Gamification Badges */}
      {activeTooltip && (
        <div
          className="fixed z-[99999] p-4 rounded-2xl bg-[#1f1f1f]/95 backdrop-blur-md border border-white/10 shadow-2xl flex flex-col gap-1 items-center pointer-events-none animate-in fade-in zoom-in-95 duration-200"
          style={{
            top: activeTooltip.rect.top - 10,
            left: activeTooltip.isFirst ? activeTooltip.rect.left : activeTooltip.isLast ? activeTooltip.rect.right : activeTooltip.rect.left + activeTooltip.rect.width / 2,
            transform: `translate(${activeTooltip.isFirst ? '0' : activeTooltip.isLast ? '-100%' : '-50%'}, -100%)`,
            width: '208px'
          }}
        >
          <span className="text-white text-xs font-black text-center mb-1">{activeTooltip.def.name}</span>
          <span className="text-neutral-300 text-[11px] text-center leading-relaxed">{activeTooltip.def.description}</span>
          {activeTooltip.unlocked ? (
            <span className="text-emerald-400 text-[10px] font-bold mt-1 text-center bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Tertanda Tercapai ✅</span>
          ) : (
            <span className="text-white/30 text-[10px] font-bold mt-1 text-center italic">Terus catat untuk membuka 🔒</span>
          )}
          {/* Tooltip Arrow pointing down */}
          <div className={`absolute -bottom-2 ${activeTooltip.isFirst ? 'left-10' : activeTooltip.isLast ? 'right-10' : 'left-1/2 -translate-x-1/2'} w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-transparent border-t-white/10`}></div>
          <div className={`absolute -bottom-[7px] ${activeTooltip.isFirst ? 'left-10' : activeTooltip.isLast ? 'right-10' : 'left-1/2 -translate-x-1/2'} w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-transparent border-t-[#111]`}></div>
        </div>
      )}

      {/* Gamification Popout Overlay */}
      {gamificationPopups.length > 0 && currentPopupIndex < gamificationPopups.length && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative bg-gradient-to-b from-[#222] to-[#111] p-10 rounded-[3rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] border border-white/20 flex flex-col items-center max-w-sm w-full animate-bounce-in pointer-events-auto"
            onClick={() => {
              if (currentPopupIndex === gamificationPopups.length - 1) {
                setGamificationPopups([]);
              } else {
                setCurrentPopupIndex(prev => prev + 1);
              }
            }}
          >
            <div className="absolute -top-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-[40px] pointer-events-none" />
            <div className="w-24 h-24 mb-6 rounded-full bg-gradient-to-br from-[#111] to-[#222] shadow-inner border border-white/5 flex flex-col items-center justify-center relative">
              <div className="absolute inset-0 rounded-full bg-white/5 animate-ping"></div>
              <span className="text-5xl drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">🏆</span>
            </div>

            <h2 className="text-3xl font-black text-white tracking-tighter mb-2 text-center drop-shadow-lg">Badge Unlocked!</h2>
            <p className="text-emerald-400 font-bold text-center leading-relaxed text-sm bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 rounded-2xl w-full">
              {gamificationPopups[currentPopupIndex].replace(/🏅 PENCAPAIAN BARU: /, '')}
            </p>

            <p className="text-neutral-500 text-[10px] uppercase tracking-widest font-bold mt-8 mb-2">Tap untuk lanjut</p>
            <div className="flex gap-1.5 flex-wrap justify-center max-w-[200px]">
              {gamificationPopups.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentPopupIndex ? 'w-6 bg-emerald-400' : 'w-1.5 bg-white/20'}`}></div>
              ))}
            </div>
            <div className="absolute inset-0 rounded-[3rem] ring-1 ring-inset ring-white/10 pointer-events-none"></div>
          </div>
        </div>
      )}
    </main>
  );
}
