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
    // Initial dummy data (20 points) simulating a "stable" period before user interaction
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


    // --- HELPERS ---
    // Budget Calculations (Depleting Logic)
    const budgetRemaining = budgetLimit - budgetSpent;
    const budgetPercent = Math.max(0, Math.min(100, Math.round((budgetRemaining / budgetLimit) * 100)));

    let budgetColor = "bg-brand-green";
    if (budgetPercent < 20) budgetColor = "bg-brand-red"; // Critical
    else if (budgetPercent < 50) budgetColor = "bg-yellow-400"; // Warning

    const isOverBudget = budgetRemaining < 0;

    // Chart Config
    const chartData = {
        labels: Array.from({ length: 20 }, (_, i) => i.toString()), // hidden labels
        datasets: [
            {
                label: 'Saldo',
                data: chartValues,
                borderColor: '#10B981', // Brand Green
                backgroundColor: (context: any) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
                    gradient.addColorStop(0, "rgba(16, 185, 129, 0.4)");
                    gradient.addColorStop(1, "rgba(16, 185, 129, 0)");
                    return gradient;
                },
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { enabled: false }, // Disable tooltips for cleaner sim
        },
        scales: {
            x: { display: false },
            y: { display: false, min: 0 }, // Hide axes
        },
        animation: {
            duration: 500
        }
    };

    return (
        <section className="py-20 bg-neutral-50 dark:bg-neutral-900/50 overflow-hidden relative">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold mb-4 text-neutral-900 dark:text-white">Semua Tercatat Otomatis</h2>
                    <p className="text-neutral-600 dark:text-neutral-400">Visualisasikan keuanganmu. Coba simulasi "Beli Makan" di bawah ini!</p>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4">
                {/* Mockup Window */}
                <div className="bg-white dark:bg-neutral-800 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden transform transition-all duration-500 relative">

                    {/* Window Controls */}
                    <div className="h-4 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 flex items-center px-4 gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-400" />
                        <div className="w-3 h-3 rounded-full bg-yellow-400" />
                        <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>

                    {/* App UI */}
                    <div className="p-4 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-8">

                        {/* LEFT COLUMN: Main Stats & Chart */}
                        <div className="md:col-span-2 space-y-6">
                            {/* Balance Card */}
                            <div className="p-6 rounded-2xl bg-brand-green text-white shadow-lg relative overflow-hidden group">
                                <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                                <p className="text-sm opacity-90 mb-1">Total Saldo</p>
                                <h2 className="text-4xl font-bold mb-4">Rp {balance.toLocaleString("id-ID")}</h2>

                                {/* Line Chart Simulation */}
                                <div className="h-24 w-full relative">
                                    <Line data={chartData} options={chartOptions as any} />
                                </div>
                            </div>

                            {/* Budget Card (Depleting) */}
                            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-700 border border-neutral-100 dark:border-neutral-600 shadow-sm">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold text-neutral-900 dark:text-white">Budget Makan</span>
                                    <span className={`text-xs font-bold ${isOverBudget ? "text-red-500" : "text-neutral-500"}`}>
                                        {isOverBudget ? "Overbudget!" : `${budgetPercent}% Tersisa`}
                                    </span>
                                </div>
                                <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-3 rounded-full overflow-hidden mb-2">
                                    <div
                                        className={`h-full rounded-full transition-all duration-300 ${isOverBudget ? "bg-red-500 w-full animate-pulse" : budgetColor}`}
                                        style={{ width: isOverBudget ? '0%' : `${budgetPercent}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs text-neutral-500">
                                    <span>Sisa: Rp {Math.max(0, budgetRemaining).toLocaleString("id-ID")}</span>
                                    <span>Limit: Rp 200.000</span>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: History & Action */}
                        <div className="space-y-6 flex flex-col h-full">

                            {/* Action Button */}
                            <div className="bg-brand-yellow/10 dark:bg-brand-yellow/5 p-6 rounded-2xl border border-brand-yellow/20 text-center">
                                <span className="text-4xl mb-2 block">🍔</span>
                                <h4 className="font-bold text-neutral-900 dark:text-white">Lapar?</h4>
                                <p className="text-xs text-neutral-600 mb-4">Makan siang Rp 50.000</p>
                                <button
                                    onClick={handleSimulateSpend}
                                    disabled={clickCount >= 10}
                                    className={`w-full py-3 rounded-xl font-bold shadow-lg transition-all 
                                        ${clickCount >= 10
                                            ? "bg-neutral-300 dark:bg-neutral-700 text-neutral-500 cursor-not-allowed"
                                            : "bg-brand-yellow text-brand-red hover:scale-105 active:scale-95"}`}
                                >
                                    {clickCount >= 10 ? "Kenyang! 😋" : "Beli Makan (-50rb)"}
                                </button>
                                <p className="text-[10px] text-neutral-400 mt-2">Coba klik sampai budget habis!</p>
                            </div>

                            {/* Scrollable History */}
                            <div className="flex-1 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl p-4 border border-neutral-100 dark:border-neutral-700 flex flex-col overflow-hidden min-h-[200px]">
                                <h4 className="font-bold text-sm text-neutral-900 dark:text-white mb-3">Riwayat Transaksi</h4>
                                <div
                                    ref={historyRef}
                                    className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1 max-h-[240px]"
                                >
                                    {transactions.map((item, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-neutral-700 shadow-sm animate-fade-in-up">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-600 flex items-center justify-center text-lg">{item.icon}</div>
                                                <div>
                                                    <p className="font-semibold text-xs text-neutral-900 dark:text-white">{item.name}</p>
                                                    <p className="text-[10px] text-neutral-500">{item.time}</p>
                                                </div>
                                            </div>
                                            <span className={`font-bold text-xs ${item.amount > 0 ? "text-brand-green" : "text-brand-red"}`}>
                                                {item.amount > 0 ? "+" : ""}{item.amount.toLocaleString("id-ID")}
                                            </span>
                                        </div>
                                    ))}
                                    {transactions.length === 0 && <p className="text-xs text-center text-neutral-400 py-4">Belum ada transaksi</p>}
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* POP OUT MODAL (Overlay) */}
                    {showRegisterModal && (
                        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                            <div className="bg-white dark:bg-neutral-900 w-full max-w-sm rounded-[2rem] p-8 text-center shadow-2xl scale-100 animate-bounce-in relative overflow-hidden">
                                {/* Close Button */}
                                <button
                                    onClick={() => setShowRegisterModal(false)}
                                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-200 transition-colors"
                                >
                                    ✕
                                </button>

                                {/* Decoration */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-brand-green/20 blur-3xl rounded-full pointer-events-none"></div>

                                <div className="relative z-10">
                                    <div className="text-6xl mb-4">🚀</div>
                                    <h3 className="text-2xl font-extrabold text-neutral-900 dark:text-white mb-2">
                                        Seru, kan?
                                    </h3>
                                    <p className="text-neutral-600 dark:text-neutral-400 mb-8 leading-relaxed">
                                        Ini baru simulasi. Daftar sekarang buat atur duit beneran, bikin budget, dan capai goals kamu!
                                    </p>

                                    <Link
                                        href="/register"
                                        className="block w-full py-4 rounded-xl bg-gradient-to-r from-brand-green to-teal-500 text-white font-bold text-lg shadow-xl shadow-brand-green/30 hover:shadow-brand-green/50 hover:scale-[1.02] transition-all transform active:scale-95"
                                    >
                                        Ayok Daftar Sekarang! ✨
                                    </Link>
                                    <p className="mt-4 text-xs text-neutral-400">Gratis seumur hidup. Tanpa kartu kredit.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
