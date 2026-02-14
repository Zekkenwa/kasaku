"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Reuse similar props logic as TransactionForm
type Props = {
    onClose: () => void;
    categories: { id: string; name: string; type: string }[];
    wallets: { id: string; name: string }[];
    initialData?: any;
};

export default function RecurringForm({ onClose, categories, wallets, initialData }: Props) {
    const router = useRouter();
    const [name, setName] = useState(initialData?.name || "");
    const [amount, setAmount] = useState(initialData?.amount || "");
    const [type, setType] = useState(initialData?.type || "EXPENSE");
    const [categoryId, setCategoryId] = useState(initialData?.categoryId || "");
    const [walletId, setWalletId] = useState(initialData?.walletId || (wallets.length > 0 ? wallets[0].id : ""));
    const [frequency, setFrequency] = useState(initialData?.frequency || "MONTHLY");
    const [interval, setInterval] = useState(initialData?.interval || 1);
    const [startDate, setStartDate] = useState(initialData?.startDate ? new Date(initialData.startDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
    const [note, setNote] = useState(initialData?.note || "");
    const [loading, setLoading] = useState(false);

    // Filter categories by type
    const filteredCategories = categories.filter(c => c.type === type);

    useEffect(() => {
        // Auto-select first category if current is invalid
        if (!categoryId && filteredCategories.length > 0) {
            setCategoryId(filteredCategories[0].id);
        } else if (categoryId && !filteredCategories.find(c => c.id === categoryId)) {
            if (filteredCategories.length > 0) setCategoryId(filteredCategories[0].id);
            else setCategoryId("");
        }
    }, [type, categories, categoryId, filteredCategories]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = initialData ? `/api/recurring/${initialData.id}` : "/api/recurring";
            const method = initialData ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    amount: Number(amount),
                    type,
                    categoryId,
                    walletId,
                    frequency,
                    interval: Number(interval),
                    startDate,
                    note,
                }),
            });

            if (res.ok) {
                router.refresh();
                onClose();
            } else {
                alert("Gagal menyimpan recurring");
            }
        } catch (error) {
            alert("Terjadi kesalahan");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
            {/* Name */}
            <div>
                <label className="block text-sm font-medium dark:text-gray-200">Nama Rutinitas</label>
                <input
                    type="text"
                    required
                    placeholder="Contoh: Gaji Bulanan, Netflix"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
            </div>

            {/* Type */}
            <div className="flex gap-4">
                <label className="flex items-center text-gray-900 dark:text-gray-200">
                    <input type="radio" value="EXPENSE" checked={type === "EXPENSE"} onChange={(e) => setType(e.target.value)} className="mr-2" />
                    Pengeluaran
                </label>
                <label className="flex items-center text-gray-900 dark:text-gray-200">
                    <input type="radio" value="INCOME" checked={type === "INCOME"} onChange={(e) => setType(e.target.value)} className="mr-2" />
                    Pemasukan
                </label>
            </div>

            {/* Amount */}
            <div>
                <label className="block text-sm font-medium dark:text-gray-200">Jumlah</label>
                <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
            </div>

            {/* Category & Wallet */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium dark:text-gray-200">Kategori</label>
                    <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" required>
                        {filteredCategories.length === 0 && <option value="">-</option>}
                        {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium dark:text-gray-200">Wallet</label>
                    <select value={walletId} onChange={(e) => setWalletId(e.target.value)} className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" required>
                        {wallets.length === 0 && <option value="">-</option>}
                        {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Frequency */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium dark:text-gray-200">Frekuensi</label>
                    <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <option value="DAILY">Harian</option>
                        <option value="WEEKLY">Mingguan</option>
                        <option value="MONTHLY">Bulanan</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium dark:text-gray-200">Interval (Setiap X)</label>
                    <input
                        type="number"
                        min="1"
                        value={interval}
                        onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setInterval(isNaN(val) || val < 1 ? 1 : val);
                        }}
                        className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                </div>
            </div>

            {/* Start Date */}
            <div>
                <label className="block text-sm font-medium dark:text-gray-200">Mulai Tanggal</label>
                <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" style={{ colorScheme: "light dark" }} />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-black dark:bg-[#458B73] text-white rounded hover:bg-gray-800 dark:hover:bg-[#3aa381] disabled:opacity-50 transition-colors"
            >
                {loading ? "Menyimpan..." : "Simpan Rutinitas"}
            </button>
        </form>
    );
}
