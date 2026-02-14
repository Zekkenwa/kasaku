"use client";

import { useState } from "react";

export default function Simulation() {
    const [balance, setBalance] = useState(15000000);
    const [expense, setExpense] = useState(2500000);
    const [activeTab, setActiveTab] = useState("overview");

    const handleSimulateSpend = () => {
        const amount = 50000;
        setBalance(prev => prev - amount);
        setExpense(prev => prev + amount);
    };

    const activity = [
        { icon: "🍔", name: "Makan Siang", amount: -50000, time: "Baru saja" },
        { icon: "🛒", name: "Belanja Bulanan", amount: -1200000, time: "Kemarin" },
        { icon: "💰", name: "Gajian", amount: 15000000, time: "2 hari lalu" },
    ];

    return (
        <section className="py-20 bg-neutral-50 dark:bg-neutral-900/50 overflow-hidden">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold mb-4 text-neutral-900 dark:text-white">Semua Tercatat Rapi</h2>
                    <p className="text-neutral-600 dark:text-neutral-400">Bayangkan memiliki kendali penuh atas uangmu. Coba simulasi di bawah ini.</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto">
                {/* Mockup Window */}
                <div className="bg-white dark:bg-neutral-800 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden transform transition-all hover:scale-[1.01] duration-500">
                    {/* Window Controls */}
                    <div className="h-4 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 flex items-center px-4 gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-400" />
                        <div className="w-3 h-3 rounded-full bg-yellow-400" />
                        <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>

                    {/* App UI */}
                    <div className="p-6 md:p-8">
                        {/* Header */}
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <p className="text-sm text-neutral-500">Selamat Pagi,</p>
                                <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Pengguna Baru</h3>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-brand-green/20 flex items-center justify-center text-brand-green font-bold">U</div>
                        </div>

                        {/* Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div className="p-6 rounded-2xl bg-brand-green text-white shadow-lg relative overflow-hidden group">
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
                                <p className="text-sm opacity-90 mb-1">Total Saldo</p>
                                <h2 className="text-3xl font-bold">Rp {balance.toLocaleString("id-ID")}</h2>
                                <div className="mt-4 flex gap-2">
                                    <span className="text-xs bg-white/20 px-2 py-1 rounded">BCA</span>
                                    <span className="text-xs bg-white/20 px-2 py-1 rounded">Gopay</span>
                                </div>
                            </div>

                            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-700 border border-neutral-100 dark:border-neutral-600 shadow-sm flex flex-col justify-center">
                                <p className="text-sm text-neutral-500 dark:text-neutral-300 mb-1">Pengeluaran Bulan Ini</p>
                                <h2 className="text-3xl font-bold text-brand-red">Rp {expense.toLocaleString("id-ID")}</h2>
                                <div className="w-full bg-neutral-100 dark:bg-neutral-600 h-2 mt-4 rounded-full overflow-hidden">
                                    <div className="h-full bg-brand-red w-[45%]" />
                                </div>
                            </div>
                        </div>

                        {/* Interaction Area */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Recent Activity */}
                            <div className="md:col-span-2">
                                <h4 className="font-bold text-lg mb-4 text-neutral-900 dark:text-white">Riwayat Transaksi</h4>
                                <div className="space-y-3">
                                    {activity.map((item, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-700/50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-white dark:bg-neutral-600 flex items-center justify-center text-xl shadow-sm">{item.icon}</div>
                                                <div>
                                                    <p className="font-semibold text-sm text-neutral-900 dark:text-white">{item.name}</p>
                                                    <p className="text-xs text-neutral-500">{item.time}</p>
                                                </div>
                                            </div>
                                            <span className={`font-bold text-sm ${item.amount > 0 ? "text-brand-green" : "text-brand-red"}`}>
                                                {item.amount > 0 ? "+" : ""}{item.amount.toLocaleString("id-ID")}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Simulator Action */}
                            <div className="bg-brand-yellow/10 dark:bg-brand-yellow/5 p-6 rounded-2xl border border-brand-yellow/20 flex flex-col items-center justify-center text-center">
                                <div className="mb-4">
                                    <span className="text-4xl">🍔</span>
                                </div>
                                <h4 className="font-bold text-neutral-900 dark:text-white mb-2">Lapar?</h4>
                                <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-4">Simulasikan beli makan siang seharga Rp 50.000</p>
                                <button
                                    onClick={handleSimulateSpend}
                                    className="px-4 py-2 bg-brand-yellow text-brand-red font-bold rounded-xl shadow-lg hover:scale-105 transition-transform active:scale-95"
                                >
                                    Beli Makan (-50rb)
                                </button>
                                <p className="text-[10px] text-neutral-400 mt-2">Lihat saldo & pengeluaran berubah!</p>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
        </section >
    );
}
