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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// --- TYPES ---
type ChatMessage = {
    sender: "bot" | "user";
    text: string;
    time: string;
};

type Transaction = {
    icon: string;
    name: string;
    amount: number;
    category: string;
    time: string;
};

// --- HELPERS ---
const formatRp = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

const getTimeStr = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const parseAmount = (str: string): number | null => {
    const cleaned = str.toLowerCase().replace(/\./g, "").replace(/,/g, "").trim();
    // Handle "k" shorthand (50k = 50.000)
    const kMatch = cleaned.match(/^(\d+)\s*k$/);
    if (kMatch) return parseInt(kMatch[1]) * 1000;
    // Handle "rb" / "ribu" shorthand (50rb = 50.000)
    const rbMatch = cleaned.match(/^(\d+)\s*(rb|ribu)$/);
    if (rbMatch) return parseInt(rbMatch[1]) * 1000;
    // Handle "jt" / "juta" shorthand (5jt = 5.000.000)
    const jtMatch = cleaned.match(/^(\d+)\s*(jt|juta)$/);
    if (jtMatch) return parseInt(jtMatch[1]) * 1000000;
    // Plain number
    const num = parseInt(cleaned);
    return isNaN(num) ? null : num;
};

const CATEGORIES: Record<string, string> = {
    jajan: "🍔",
    makan: "🍔",
    transport: "🚗",
    transportasi: "🚗",
    belanja: "🛍️",
    hiburan: "🎮",
    gaji: "💰",
    komisi: "💰",
    bonus: "💰",
    lainnya: "📦",
};

const HELP_TEXT = `📋 *Perintah yang tersedia:*

• *keluar [jumlah] [kategori]*
  Contoh: keluar 50k jajan

• *masuk [jumlah] [kategori]*
  Contoh: masuk 100rb gaji

• *saldo*
  Cek saldo saat ini

• *laporan*
  Lihat ringkasan transaksi

💡 Jumlah bisa pakai: 50k, 50rb, 5jt
Kategori: jajan, makan, transport, belanja, hiburan, gaji, komisi, bonus, lainnya`;

export default function Simulation() {
    // --- STATE ---
    const [balance, setBalance] = useState(2500000);
    const [transactions, setTransactions] = useState<Transaction[]>([
        { icon: "💰", name: "Gajian", amount: 2500000, category: "Gaji", time: "Hari ini" }
    ]);
    const [messages, setMessages] = useState<ChatMessage[]>([
        { sender: "bot", text: "Halo Guest! 👋\nKetik *help* untuk melihat perintah yang tersedia.\n\nContoh, ketik : *keluar 50k jajan* untuk mencatat pengeluaran.", time: getTimeStr() }
    ]);
    const [input, setInput] = useState("");
    const [userMsgCount, setUserMsgCount] = useState(0);
    const [showRegisterModal, setShowRegisterModal] = useState(false);

    // Chart state
    const initialChartData = Array.from({ length: 20 }, () => 2500000);
    const [chartValues, setChartValues] = useState<number[]>(initialChartData);

    // Budget State
    const budgetLimit = 200000;
    const [budgetSpent, setBudgetSpent] = useState(0);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll chat (scoped to chat container only, never scrolls the page)
    useEffect(() => {
        const el = chatEndRef.current;
        if (el?.parentElement) {
            el.parentElement.scrollTop = el.parentElement.scrollHeight;
        }
    }, [messages]);

    // --- COMMAND PARSER ---
    const processCommand = (rawInput: string) => {
        const trimmed = rawInput.trim();
        if (!trimmed) return;

        const time = getTimeStr();

        // Add user message
        setMessages(prev => [...prev, { sender: "user", text: trimmed, time }]);
        const newCount = userMsgCount + 1;
        setUserMsgCount(newCount);

        // Check 20-message limit
        if (newCount >= 20) {
            setTimeout(() => {
                setMessages(prev => [...prev, { sender: "bot", text: "🚀 Wah, kamu sudah mengirim 20 pesan! Daftar sekarang untuk menggunakan fitur lengkapnya ya!", time: getTimeStr() }]);
                setShowRegisterModal(true);
            }, 600);
            return;
        }

        const lower = trimmed.toLowerCase();
        const parts = lower.split(/\s+/);

        // --- HELP ---
        if (lower === "help" || lower === "bantuan") {
            setTimeout(() => {
                setMessages(prev => [...prev, { sender: "bot", text: HELP_TEXT, time: getTimeStr() }]);
            }, 400);
            return;
        }

        // --- SALDO ---
        if (lower === "saldo") {
            setTimeout(() => {
                setMessages(prev => [...prev, { sender: "bot", text: `💰 Saldo kamu saat ini:\n\n*${formatRp(balance)}*`, time: getTimeStr() }]);
            }, 400);
            return;
        }

        // --- LAPORAN ---
        if (lower === "laporan") {
            const totalIn = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
            const totalOut = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
            const cats = transactions.filter(t => t.amount < 0).reduce((acc, t) => {
                acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
                return acc;
            }, {} as Record<string, number>);
            const catLines = Object.entries(cats).map(([k, v]) => `  • ${k}: ${formatRp(v)}`).join("\n");

            const report = `📊 *Laporan Transaksi*\n\n💰 Total Pemasukan: ${formatRp(totalIn)}\n💸 Total Pengeluaran: ${formatRp(totalOut)}\n📈 Saldo: ${formatRp(balance)}\n\n${catLines ? `📂 Pengeluaran per Kategori:\n${catLines}` : "Belum ada pengeluaran."}`;

            setTimeout(() => {
                setMessages(prev => [...prev, { sender: "bot", text: report, time: getTimeStr() }]);
            }, 500);
            return;
        }

        // --- PENGELUARAN ---
        if (parts[0] === "pengeluaran" || parts[0] === "keluar") {
            if (parts.length < 3) {
                setTimeout(() => {
                    setMessages(prev => [...prev, { sender: "bot", text: "⚠️ Format: *pengeluaran [jumlah] [kategori]*\nContoh: pengeluaran 50000 jajan", time: getTimeStr() }]);
                }, 400);
                return;
            }
            const amount = parseAmount(parts[1]);
            if (!amount || amount <= 0) {
                setTimeout(() => {
                    setMessages(prev => [...prev, { sender: "bot", text: "❌ Jumlah tidak valid. Gunakan angka, contoh: 50000, 50rb, 1jt", time: getTimeStr() }]);
                }, 400);
                return;
            }
            const catKey = parts.slice(2).join(" ");
            const category = catKey.charAt(0).toUpperCase() + catKey.slice(1);
            const icon = CATEGORIES[catKey.toLowerCase()] || "📦";
            addExpense(amount, category, icon);
            return;
        }

        // --- PEMASUKAN ---
        if (parts[0] === "pemasukan" || parts[0] === "masuk") {
            if (parts.length < 3) {
                setTimeout(() => {
                    setMessages(prev => [...prev, { sender: "bot", text: "⚠️ Format: *pemasukan [jumlah] [kategori]*\nContoh: pemasukan 100000 gaji", time: getTimeStr() }]);
                }, 400);
                return;
            }
            const amount = parseAmount(parts[1]);
            if (!amount || amount <= 0) {
                setTimeout(() => {
                    setMessages(prev => [...prev, { sender: "bot", text: "❌ Jumlah tidak valid. Gunakan angka, contoh: 100000, 100rb, 1jt", time: getTimeStr() }]);
                }, 400);
                return;
            }
            const catKey = parts.slice(2).join(" ");
            const category = catKey.charAt(0).toUpperCase() + catKey.slice(1);
            const icon = CATEGORIES[catKey.toLowerCase()] || "💰";
            addIncome(amount, category, icon);
            return;
        }

        // --- UNKNOWN ---
        setTimeout(() => {
            setMessages(prev => [...prev, { sender: "bot", text: "🤔 Maaf, saya tidak mengerti perintah tersebut.\nKetik *help* untuk melihat perintah yang tersedia.", time: getTimeStr() }]);
        }, 400);
    };

    // --- TRANSACTION HANDLERS ---
    const addExpense = (amount: number, category: string, icon: string) => {
        const newBalance = balance - amount;
        setBalance(newBalance);
        setBudgetSpent(prev => prev + amount);

        const tx: Transaction = { icon, name: category, amount: -amount, category, time: getTimeStr() };
        setTransactions(prev => [tx, ...prev]);

        setChartValues(prev => {
            const next = [...prev];
            next.shift();
            next.push(newBalance);
            return next;
        });

        const debtAmount = newBalance < 0 ? Math.abs(newBalance) : 0;
        const balanceLabel = newBalance < 0 ? `⚠️ Saldo: *${formatRp(newBalance)}*\n🔴 Hutang: *${formatRp(debtAmount)}*` : `💰 Sisa saldo: *${formatRp(newBalance)}*`;

        setTimeout(() => {
            setMessages(prev => [...prev, {
                sender: "bot",
                text: `✅ Pengeluaran tercatat!\n\n${icon} *${category}*\n💸 ${formatRp(amount)}\n${balanceLabel}`,
                time: getTimeStr()
            }]);
        }, 500);
    };

    const addIncome = (amount: number, category: string, icon: string) => {
        const newBalance = balance + amount;
        setBalance(newBalance);

        const tx: Transaction = { icon, name: category, amount, category, time: getTimeStr() };
        setTransactions(prev => [tx, ...prev]);

        setChartValues(prev => {
            const next = [...prev];
            next.shift();
            next.push(newBalance);
            return next;
        });

        setTimeout(() => {
            setMessages(prev => [...prev, {
                sender: "bot",
                text: `✅ Pemasukan tercatat!\n\n${icon} *${category}*\n💰 +${formatRp(amount)}\n💰 Saldo sekarang: ${formatRp(newBalance)}`,
                time: getTimeStr()
            }]);
        }, 500);
    };

    // --- QUICK ACTION (Jajan button) ---
    const handleQuickSpend = () => {
        if (userMsgCount >= 20) {
            setShowRegisterModal(true);
            return;
        }
        const time = getTimeStr();
        setMessages(prev => [...prev, { sender: "user", text: "pengeluaran 50000 jajan", time }]);
        setUserMsgCount(prev => prev + 1);
        addExpense(50000, "Jajan", "🍔");
    };

    // --- FORM SUBMIT ---
    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        processCommand(input);
        setInput("");
        inputRef.current?.focus();
    };

    // --- COMPUTED ---
    const budgetRemaining = budgetLimit - budgetSpent;
    const budgetPercent = Math.max(0, Math.min(100, Math.round((budgetRemaining / budgetLimit) * 100)));
    const isOverBudget = budgetRemaining < 0;
    let budgetColor = "bg-brand-green";
    if (budgetPercent < 50) budgetColor = "bg-brand-yellow";
    if (budgetPercent < 20) budgetColor = "bg-brand-red";

    // Chart config
    const chartData = {
        labels: Array.from({ length: 20 }, (_, i) => i.toString()),
        datasets: [{
            label: 'Saldo',
            data: chartValues,
            borderColor: '#458B73',
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
        }],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false, min: 0 } },
        animation: { duration: 500, easing: 'easeOutQuart' as const },
        layout: { padding: 0 }
    };

    // Format bold markdown-style text for display
    const renderBotText = (text: string) => {
        return text.split("\n").map((line, li) => (
            <span key={li}>
                {line.split(/\*([^*]+)\*/g).map((part, pi) =>
                    pi % 2 === 1 ? <strong key={pi} className="text-white font-bold">{part}</strong> : <span key={pi}>{part}</span>
                )}
                {li < text.split("\n").length - 1 && <br />}
            </span>
        ));
    };

    return (
        <section className="py-24 bg-brand-dark/50 overflow-hidden relative" id="simulation">
            {/* Glow Background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-green/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center max-w-2xl mx-auto mb-16 animate-fade-in-up">
                    <span className="text-brand-green font-bold text-sm tracking-widest uppercase mb-2 block">Simulasi Interaktif</span>
                    <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">Coba Langsung di Sini</h2>
                    <p className="text-neutral-400 text-lg">
                        Rasakan pengalaman chatbot WhatsApp Kasaku. Ketik perintah di chat dan lihat graph serta saldo berubah secara realtime.
                    </p>
                </div>

                <div className="max-w-6xl mx-auto">
                    {/* Mockup Window */}
                    <div className="bg-[#1a1a1a] rounded-3xl shadow-2xl border border-white/5 overflow-hidden relative">
                        {/* Window Controls */}
                        <div className="h-10 bg-[#252525] border-b border-white/5 flex items-center px-4 gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-400/80" />
                            <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                            <div className="w-3 h-3 rounded-full bg-green-400/80" />
                            <div className="ml-auto text-xs text-neutral-600 font-mono">dashboard.kasaku.id</div>
                        </div>

                        {/* Main Layout: Graph Left + Chat Right */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 min-h-[560px]">

                            {/* LEFT: Dashboard Panel */}
                            <div className="col-span-12 lg:col-span-7 p-4 md:p-6 bg-[#1a1a1a] flex flex-col gap-4">
                                {/* Header */}
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-0.5">Halo, Tamu! 👋</h3>
                                        <p className="text-xs text-neutral-400">Simulasi dashboard interaktif</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Saldo</div>
                                        <div className={`text-xl font-bold tracking-tight ${balance < 0 ? 'text-red-400' : 'text-white'}`}>{formatRp(balance)}</div>
                                    </div>
                                </div>

                                {/* Chart Card */}
                                <div className="bg-[#252525] pt-4 px-4 pb-0 rounded-2xl border border-white/5 shadow-inner flex flex-col overflow-hidden relative flex-1 min-h-[200px]">
                                    <h4 className="text-xs font-bold text-neutral-300 mb-3 flex items-center gap-2 z-10">
                                        <span className="w-2 h-2 rounded-full bg-brand-green"></span>
                                        Cashflow Progressive
                                    </h4>
                                    <div className="flex-1 w-full relative -mx-4 -mb-1">
                                        <div className="absolute inset-0">
                                            <Line data={chartData} options={chartOptions as any} />
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Row: Budget + Quick Action + Transactions */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Quick Action */}
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={handleQuickSpend}
                                            disabled={userMsgCount >= 20}
                                            className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-bold shadow-lg shadow-brand-red/20 active:scale-95 hover:brightness-110 transition-all flex items-center justify-center gap-2 group text-sm"
                                        >
                                            <span className="text-lg group-hover:-translate-y-0.5 transition-transform">💸</span>
                                            Jajan Rp50.000
                                        </button>
                                        <p className="text-[10px] text-center text-neutral-600">{userMsgCount}/20 pesan</p>
                                    </div>

                                    {/* Budget */}
                                    <div className="bg-[#252525] p-4 rounded-2xl border border-white/5">
                                        <div className="flex justify-between items-end mb-1.5">
                                            <span className="text-xs font-medium text-neutral-300">Budget Makan</span>
                                            <span className={`text-[10px] font-bold ${isOverBudget ? "text-red-400" : "text-neutral-400"}`}>
                                                {isOverBudget ? "Over!" : `${budgetPercent}%`}
                                            </span>
                                        </div>
                                        <div className="w-full bg-[#333] h-2.5 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-300 ${isOverBudget ? "bg-red-500 w-full animate-pulse" : budgetColor}`}
                                                style={{ width: isOverBudget ? '0%' : `${budgetPercent}%` }}
                                            />
                                        </div>
                                        <div className="text-right text-[10px] text-neutral-500 mt-1">
                                            Sisa: {formatRp(Math.max(0, budgetRemaining))}
                                        </div>
                                    </div>

                                    {/* Debt Card (appears when balance < 0) */}
                                    {balance < 0 && (
                                        <div className="col-span-1 md:col-span-3 bg-red-500/10 p-4 rounded-2xl border border-red-500/20 animate-slide-in-right">
                                            <div className="flex justify-between items-end mb-1.5">
                                                <span className="text-xs font-bold text-red-400 flex items-center gap-1.5">🔴 Hutang</span>
                                                <span className="text-[10px] font-bold text-red-400">{formatRp(Math.abs(balance))}</span>
                                            </div>
                                            <div className="w-full bg-red-900/30 h-2.5 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full bg-red-500 animate-pulse w-full" />
                                            </div>
                                            <div className="text-right text-[10px] text-red-400/70 mt-1">
                                                Saldo minus, kamu berhutang!
                                            </div>
                                        </div>
                                    )}

                                    {/* Mini Transactions */}
                                    <div className="bg-[#252525] p-4 rounded-2xl border border-white/5 overflow-hidden flex flex-col">
                                        <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Riwayat</h4>
                                        <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar max-h-24">
                                            {transactions.slice(0, 5).map((tx, i) => (
                                                <div key={i} className="flex items-center gap-2 text-xs">
                                                    <span>{tx.icon}</span>
                                                    <span className="text-neutral-300 truncate flex-1">{tx.name}</span>
                                                    <span className={`font-bold ${tx.amount > 0 ? "text-brand-green" : "text-brand-red"}`}>
                                                        {tx.amount > 0 ? "+" : ""}{formatRp(tx.amount)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: Chat Simulator */}
                            <div className="col-span-12 lg:col-span-5 bg-[#111] border-t lg:border-t-0 lg:border-l border-white/5 flex flex-col">
                                {/* Chat Header */}
                                <div className="bg-[#1a1a1a] border-b border-white/5 px-4 py-3 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-[#252525] border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                                        <img src="/logo.png" alt="Kasaku Bot" className="w-6 h-6 rounded" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-bold text-white leading-tight flex items-center gap-1.5">
                                            Kasaku Bot
                                            <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse"></span>
                                        </div>
                                        <div className="text-[10px] text-neutral-500">Online • WhatsApp Simulator</div>
                                    </div>
                                    <span className="text-neutral-600 text-lg">⋮</span>
                                </div>

                                {/* Chat Messages */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-[#0d1117] min-h-[300px] max-h-[420px]">
                                    {messages.map((msg, i) => (
                                        <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} animate-slide-in-right`}>
                                            {msg.sender === "bot" && (
                                                <div className="w-6 h-6 rounded-full bg-[#252525] border border-white/10 flex items-center justify-center shrink-0 mr-2 mt-1 overflow-hidden">
                                                    <img src="/logo.png" alt="Bot" className="w-4 h-4 rounded" />
                                                </div>
                                            )}
                                            <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed relative ${msg.sender === "user"
                                                ? "bg-[#005c4b] text-white rounded-br-sm"
                                                : "bg-[#1f2937] text-neutral-200 rounded-bl-sm"
                                                }`}>
                                                {msg.sender === "bot" ? renderBotText(msg.text) : msg.text}
                                                <div className={`text-[9px] mt-1 ${msg.sender === "user" ? "text-white/40 text-right" : "text-neutral-500"}`}>
                                                    {msg.time}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>

                                {/* Chat Input */}
                                <form onSubmit={handleSend} className="bg-[#1a1a1a] border-t border-white/5 px-3 py-2.5 flex items-center gap-2">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Ketik pesan..."
                                        disabled={userMsgCount >= 20}
                                        className="flex-1 bg-[#252525] border border-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-brand-green/50 outline-none transition-colors disabled:opacity-40"
                                        autoComplete="off"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!input.trim() || userMsgCount >= 20}
                                        className="w-10 h-10 rounded-full bg-brand-green hover:bg-brand-green/80 flex items-center justify-center text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0 shadow-lg shadow-brand-green/20"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                                        </svg>
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Register CTA Modal (After 20 messages) */}
                        {showRegisterModal && (
                            <div className="absolute inset-0 bg-neutral-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                                <div className="bg-[#252525] p-8 rounded-3xl max-w-sm w-full text-center border border-white/10 shadow-2xl">
                                    <div className="w-16 h-16 bg-brand-green/20 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 animate-bounce">
                                        🚀
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-2">Seru Kan?</h3>
                                    <p className="text-neutral-400 mb-6">
                                        Ini baru simulasi. Daftar sekarang untuk atur keuangan aslimu lewat WhatsApp dengan AI cerdas!
                                    </p>
                                    <Link href="/register" className="block w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-green to-teal-500 text-white font-bold hover:scale-105 transition-transform">
                                        Daftar Gratis Sekarang
                                    </Link>
                                    <button
                                        onClick={() => {
                                            setUserMsgCount(0);
                                            setShowRegisterModal(false);
                                            setBalance(2500000);
                                            setBudgetSpent(0);
                                            setTransactions([{ icon: "💰", name: "Gajian", amount: 2500000, category: "Gaji", time: "Hari ini" }]);
                                            setMessages([{ sender: "bot", text: "Halo Guest! 👋\nKetik *help* untuk melihat perintah yang tersedia.\n\nContoh, ketik : *keluar 50k jajan* untuk mencatat pengeluaran.", time: getTimeStr() }]);
                                            setChartValues(Array.from({ length: 20 }, () => 2500000));
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
