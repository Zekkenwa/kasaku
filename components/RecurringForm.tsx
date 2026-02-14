"use client";

import { useState, useEffect, useMemo } from "react";
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
    const filteredCategories = useMemo(() =>
        categories.filter(c => c.type === type),
        [categories, type]
    );

    useEffect(() => {
        // Auto-select first category if current is invalid
        if (!categoryId && filteredCategories.length > 0) {
            setCategoryId(filteredCategories[0].id);
        } else if (categoryId && !filteredCategories.find(c => c.id === categoryId)) {
            if (filteredCategories.length > 0) setCategoryId(filteredCategories[0].id);
            else setCategoryId("");
        }
    }, [type, filteredCategories, categoryId]);


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
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar">
            {/* Name */}
            <div>
                <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wide">Nama Rutinitas</label>
                <input
                    type="text"
                    required
                    placeholder="Contoh: Gaji Bulanan, Netflix"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-white/10 rounded-xl px-4 py-3 text-sm bg-black/20 text-white focus:outline-none focus:ring-1 focus:ring-[#458B73] placeholder-neutral-600"
                />
            </div>

            {/* Type */}
            <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${type === "EXPENSE" ? "bg-[#F26076]/20 border-[#F26076] text-[#F26076]" : "bg-black/20 border-white/5 text-neutral-400 hover:bg-white/5"}`}>
                    <input
                        type="radio"
                        value="EXPENSE"
                        checked={type === "EXPENSE"}
                        onChange={(e) => setType(e.target.value)}
                        className="hidden"
                    />
                    <span className="text-sm font-bold">Pengeluaran</span>
                </label>
                <label className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${type === "INCOME" ? "bg-[#458B73]/20 border-[#458B73] text-[#458B73]" : "bg-black/20 border-white/5 text-neutral-400 hover:bg-white/5"}`}>
                    <input
                        type="radio"
                        value="INCOME"
                        checked={type === "INCOME"}
                        onChange={(e) => setType(e.target.value)}
                        className="hidden"
                    />
                    <span className="text-sm font-bold">Pemasukan</span>
                </label>
            </div>

            {/* Amount */}
            <div>
                <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wide">Jumlah</label>
                <div className="relative">
                    <span className="absolute left-4 top-3 text-neutral-500 text-sm">Rp</span>
                    <input
                        type="number"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm bg-black/20 text-white focus:outline-none focus:ring-1 focus:ring-[#458B73] placeholder-neutral-600"
                    />
                </div>
            </div>

            {/* Category & Wallet */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wide">Kategori</label>
                    <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full border border-white/10 rounded-xl px-4 py-3 text-sm bg-black/20 text-white focus:outline-none focus:ring-1 focus:ring-[#458B73] appearance-none" required>
                        {filteredCategories.length === 0 && <option value="" className="bg-[#252525]">-</option>}
                        {filteredCategories.map(c => <option key={c.id} value={c.id} className="bg-[#252525]">{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wide">Wallet</label>
                    <select value={walletId} onChange={(e) => setWalletId(e.target.value)} className="w-full border border-white/10 rounded-xl px-4 py-3 text-sm bg-black/20 text-white focus:outline-none focus:ring-1 focus:ring-[#458B73] appearance-none" required>
                        {wallets.length === 0 && <option value="" className="bg-[#252525]">-</option>}
                        {wallets.map(w => <option key={w.id} value={w.id} className="bg-[#252525]">{w.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Frequency */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wide">Frekuensi</label>
                    <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="w-full border border-white/10 rounded-xl px-4 py-3 text-sm bg-black/20 text-white focus:outline-none focus:ring-1 focus:ring-[#458B73] appearance-none">
                        <option value="DAILY" className="bg-[#252525]">Harian</option>
                        <option value="WEEKLY" className="bg-[#252525]">Mingguan</option>
                        <option value="MONTHLY" className="bg-[#252525]">Bulanan</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wide">Interval</label>
                    <div className="relative">
                        <input
                            type="number"
                            min="1"
                            value={interval}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setInterval(isNaN(val) || val < 1 ? 1 : val);
                            }}
                            className="w-full border border-white/10 rounded-xl px-4 py-3 text-sm bg-black/20 text-white focus:outline-none focus:ring-1 focus:ring-[#458B73]"
                        />
                        <span className="absolute right-4 top-3 text-neutral-500 text-xs text-right">x</span>
                    </div>
                </div>
            </div>

            {/* Start Date */}
            <div>
                <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wide">Mulai Tanggal</label>
                <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border border-white/10 rounded-xl px-4 py-3 text-sm bg-black/20 text-white focus:outline-none focus:ring-1 focus:ring-[#458B73]" style={{ colorScheme: "dark" }} />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#458B73] text-white rounded-xl hover:bg-[#3aa381] disabled:opacity-50 transition-all font-bold shadow-lg hover:shadow-[#458B73]/20"
            >
                {loading ? "Menyimpan..." : "Simpan Rutinitas"}
            </button>
        </form>
    );
}
