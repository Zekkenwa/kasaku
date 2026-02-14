"use client";

import { useState, useRef, useEffect } from "react";
import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from "chart.js";
import Link from "next/link";

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

export default function Simulation() {
    // --- STATE ---
    const [balance, setBalance] = useState(2500000); // Start comfortable
    const [spent, setSpent] = useState(0);
    const [transactions, setTransactions] = useState([
        { icon: "💰", name: "Gajian", amount: 2500000, time: "Hari ini" }
    ]);
    const [clickCount, setClickCount] = useState(0);
    const [showRegisterModal, setShowRegisterModal] = useState(false);

    // Budget State
    const budgetLimit = 200000; // 200k limit for "Makan"
    const [budgetSpent, setBudgetSpent] = useState(0);

    // Chart Data State
    const initialChartData = Array.from({ length: 20 }, (_, i) => 2500000);
    const [chartValues, setChartValues] = useState<number[]>(initialChartData);

    const historyRef = useRef<HTMLDivElement>(null);

    // --- ACTIONS ---
    const handleSimulateSpend = () => {
        if (clickCount >= 10) {
            setShowRegisterModal(true);
            return;
        }

        const amount = 50000;
        const newSpent = spent + amount;
        const newBalance = balance - amount;

        // 1. Update Balance & Budget
        setBalance(newBalance);
        setSpent(newSpent);
        setBudgetSpent(prev => prev + amount);

        // 2. Add Transaction
        const newTx = {
            icon: "🍔",
            name: "Makan Siang",
            amount: -amount,
            time: "Baru saja"
        };
        // Add to top
        setTransactions(prev => [newTx, ...prev]);

        // 3. Update Chart
        // Remove first point, add new balance at end to create "moving" effect
        setChartValues(prev => {
            const next = [...prev];
            next.shift();
            next.push(newBalance);
            return next;
        });

        // 4. Counts
        const newCount = clickCount + 1;
        setClickCount(newCount);

        if (newCount >= 10) {
            setShowRegisterModal(true);
        }
    };

    // Auto-scroll history container check
    useEffect(() => {
        if (historyRef.current) {
            historyRef.current.scrollTop = 0; // Keep looking at top for new items
        }
    }, [transactions]);

    // --- COMPUTED ---
    const formatRp = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

    // Budget Logic (Depleting: Starts at 100%, goes to 0%)
    const budgetRemaining = budgetLimit - budgetSpent;
    const budgetPercent = Math.max(0, Math.min(100, Math.round((budgetRemaining / budgetLimit) * 100)));
    const isOverBudget = budgetRemaining < 0;

    // Budget Color
    let budgetColor = "bg-brand-green";
    if (budgetPercent < 50) budgetColor = "bg-brand-yellow"; // Warning at 50%
    if (budgetPercent < 20) budgetColor = "bg-brand-red";    // Critical at 20%

    // Chart Options
    const chartData = {
        labels: Array.from({ length: 20 }, (_, i) => i.toString()),
        datasets: [
            {
                label: 'Saldo',
                data: chartValues,
                borderColor: '#458B73', // Brand Green
                backgroundColor: (context: any) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
                    gradient.addColorStop(0, "rgba(69, 139, 115, 0.2)");
                    gradient.addColorStop(1, "rgba(69, 139, 115, 0)");
                    return gradient;
                },
                borderWidth: 3,
                tension: 0.4,
                pointRadius: 0,
                fill: true,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { enabled: false },
        },
        scales: {
            x: { display: false },
            y: { display: false, min: 0 },
        },
        animation: {
            duration: 500,
            easing: 'easeOutQuart' as const,
        },
        layout: {
            padding: 0
        }
    };


    return (
        <section className="py-24 bg-brand-dark/50 overflow-hidden relative" id="simulation">
            {/* Glow Background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-green/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center max-w-2xl mx-auto mb-16 animate-fade-in-up">
                    <span className="text-brand-green font-bold text-sm tracking-widest uppercase mb-2 block">Simulasi Interaktif</span>
                    <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">Semua Bisa Diatur</h2>
                    <p className="text-neutral-400 text-lg">
                        Simulasikan pengeluaranmu. Lihat bagaimana Kasaku mencatat dan memvisualisasikan cashflow-mu secara realtime.
                    </p>
                </div>

                <div className="max-w-5xl mx-auto px-4">
                    {/* Mockup Window - Dark Mode */}
                    <div className="bg-[#1a1a1a] rounded-3xl shadow-2xl border border-white/5 overflow-hidden transform transition-all duration-500 relative">

                        {/* Window Controls */}
                        <div className="h-10 bg-[#252525] border-b border-white/5 flex items-center px-4 gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-400/80" />
                            <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                            <div className="w-3 h-3 rounded-full bg-green-400/80" />
                            <div className="ml-auto text-xs text-neutral-600 font-mono">dashboard.kasaku.id</div>
                        </div>

                        {/* Dashboard Layout */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-0 min-h-[500px]">
                            {/* Sidebar (Visual) */}
                            <div className="hidden md:block col-span-2 bg-[#202020] border-r border-white/5 p-4 flex flex-col gap-4">
                                <div className="w-8 h-8 rounded bg-brand-green/20" />
                                <div className="h-2 w-20 bg-white/10 rounded" />
                                <div className="h-2 w-16 bg-white/10 rounded" />
                                <div className="mt-8 space-y-3">
                                    <div className="h-8 w-full bg-brand-green/10 rounded-lg border border-brand-green/20" /> {/* Active Tab */}
                                    <div className="h-8 w-full bg-transparent rounded-lg" />
                                    <div className="h-8 w-full bg-transparent rounded-lg" />
                                </div>
                            </div>

                            {/* Main Content */}
                            <div className="col-span-12 md:col-span-10 p-4 md:p-8 bg-[#1a1a1a]">
                                {/* Header */}
                                <div className="flex justify-between items-center mb-8">
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-1">Halo, Tamu! 👋</h3>
                                        <p className="text-sm text-neutral-400">Ini simulasi dashboard kamu.</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-neutral-400">Saldo Saat Ini</div>
                                        <div className="text-2xl font-bold text-white tracking-tight">{formatRp(balance)}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Chart Card */}
                                    <div className="col-span-2 bg-[#252525] pt-5 px-5 pb-0 rounded-2xl border border-white/5 shadow-inner flex flex-col overflow-hidden relative min-h-[300px]">
                                        <h4 className="text-sm font-bold text-neutral-300 mb-4 flex items-center gap-2 z-10">
                                            <span className="w-2 h-2 rounded-full bg-brand-green"></span>
                                            Cashflow Progressive
                                        </h4>
                                        <div className="flex-1 w-full relative -mx-5 -mb-1">
                                            <div className="absolute inset-0">
                                                <Line data={chartData} options={chartOptions as any} />
                                            </div>
                                            {/* Flash effect overlay when updating */}
                                            <div key={clickCount} className="absolute inset-0 bg-brand-green/5 animate-pulse-fast pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Budget & Actions Column */}
                                    <div className="space-y-6">

                                        {/* Action Button */}
                                        <button
                                            onClick={handleSimulateSpend}
                                            disabled={clickCount >= 10}
                                            className="w-full py-4 rounded-xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-bold shadow-lg shadow-brand-red/20 active:scale-95 hover:brightness-110 transition-all flex items-center justify-center gap-2 group"
                                        >
                                            <span className="text-xl group-hover:-translate-y-1 transition-transform">💸</span>
                                            Jajan Rp50.000
                                        </button>
                                        <p className="text-xs text-center text-neutral-500">
                                            Klik untuk simulasi pengeluaran ({clickCount}/10)
                                        </p>

                                        {/* Budget Card */}
                                        <div className="bg-[#252525] p-5 rounded-2xl border border-white/5">
                                            <div className="flex justify-between items-end mb-2">
                                                <span className="text-sm font-medium text-neutral-300">Budget Makan</span>
                                                <span className={`text-xs font-bold ${isOverBudget ? "text-red-400" : "text-neutral-400"}`}>
                                                    {isOverBudget ? "Overbudget!" : `${budgetPercent}% Tersisa`}
                                                </span>
                                            </div>
                                            <div className="w-full bg-[#333] h-3 rounded-full overflow-hidden mb-2">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-300 ${isOverBudget ? "bg-red-500 w-full animate-pulse" : budgetColor}`}
                                                    style={{ width: isOverBudget ? '0%' : `${budgetPercent}%` }}
                                                />
                                            </div>
                                            <div className="text-right text-xs text-neutral-500">
                                                Sisa: {formatRp(Math.max(0, budgetRemaining))}
                                            </div>
                                        </div>

                                        {/* Transaction List */}
                                        <div className="bg-[#252525] p-5 rounded-2xl border border-white/5 h-64 md:h-72 overflow-hidden flex flex-col">
                                            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4">Riwayat Transaksi</h4>
                                            <div ref={historyRef} className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                                {transactions.map((tx, i) => (
                                                    <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors animate-slide-in-right border border-transparent hover:border-white/5">
                                                        <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center text-lg border border-white/5">
                                                            {tx.icon}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-bold text-white truncate">{tx.name}</div>
                                                            <div className="text-xs text-neutral-400">{tx.time}</div>
                                                        </div>
                                                        <div className={`text-sm font-bold ${tx.amount > 0 ? "text-brand-green" : "text-brand-red"}`}>
                                                            {tx.amount > 0 ? "+" : ""}{formatRp(tx.amount)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Register Modal Overlay (After 10 clicks) */}
                        {showRegisterModal && (
                            <div className="absolute inset-0 bg-neutral-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                                <div className="bg-[#252525] p-8 rounded-3xl max-w-sm w-full text-center border border-white/10 shadow-2xl">
                                    <div className="w-16 h-16 bg-brand-green/20 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 animate-bounce">
                                        🚀
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-2">Seru Kan?</h3>
                                    <p className="text-neutral-400 mb-6">
                                        Ini baru simulasi. Daftar sekarang untuk atur keuangan aslimu dengan fitur lengkap!
                                    </p>
                                    <Link href="/register" className="block w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-green to-teal-500 text-white font-bold hover:scale-105 transition-transform">
                                        Daftar Gratis Sekarang
                                    </Link>
                                    <button
                                        onClick={() => {
                                            setClickCount(0);
                                            setShowRegisterModal(false);
                                            setBalance(2500000); // Reset
                                            setBudgetSpent(0);
                                        }}
                                        className="mt-4 text-sm text-neutral-500 hover:text-white"
                                    >
                                        Ulangi Simulasi
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </section>
    );
}



