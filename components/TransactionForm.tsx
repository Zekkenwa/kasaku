"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

type Wallet = {
    id: string;
    name: string;
};

type Props = {
    categories: string[];
    initialData?: any;
    onClose: () => void;
    onSuccess?: (gamificationData?: any) => void;
    categoryObjects: { id: string; name: string; type: string }[];
    wallets: Wallet[];
};

export default function TransactionForm({
    categories,
    initialData,
    onClose,
    onSuccess,
    categoryObjects,
    wallets,
}: Props) {
    const router = useRouter();
    const [type, setType] = useState(initialData?.type || "EXPENSE");
    const [amount, setAmount] = useState(initialData?.amount || "");
    const [categoryName, setCategoryName] = useState(
        initialData?.category || (categories.length > 0 ? categories[0] : "")
    );
    const [note, setNote] = useState(initialData?.note || "");
    const [date, setDate] = useState(
        initialData?.date || new Date().toISOString().slice(0, 10)
    );
    const [walletId, setWalletId] = useState(initialData?.walletId || (wallets.length > 0 ? wallets[0].id : ""));
    const [loading, setLoading] = useState(false);

    const filteredCategories = useMemo(() =>
        categoryObjects.filter(c => c.type === type).map(c => c.name),
        [categoryObjects, type]
    );

    useEffect(() => {
        if (!filteredCategories.includes(categoryName) && filteredCategories.length > 0) {
            setCategoryName(filteredCategories[0]);
        }
    }, [filteredCategories, categoryName]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const categoryId = categoryObjects.find((c) => c.name === categoryName)?.id;

        if (!categoryId) {
            alert("Kategori tidak valid");
            setLoading(false);
            return;
        }

        if (!walletId) {
            alert("Wallet harus dipilih");
            setLoading(false);
            return;
        }

        try {
            const url = initialData
                ? `/api/transactions/${initialData.id}`
                : "/api/transactions";
            const method = initialData ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type,
                    amount,
                    categoryId,
                    note,
                    date: (() => {
                        const now = new Date();
                        const selectedDate = new Date(date);
                        // Always append current time to the selected date to ensure unique timestamps for sorting
                        selectedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
                        return selectedDate.toISOString();
                    })(),
                    walletId,
                }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                const errorMsg = errorData?.error || "Gagal menyimpan transaksi.";
                alert(errorMsg);
                setLoading(false);
                return;
            }

            const data = await res.json().catch(() => ({}));

            if (onSuccess) {
                onSuccess(data.gamification);
            }

            router.refresh();
            onClose();
        } catch (error) {
            console.error(error);
            alert("Terjadi kesalahan jaringan");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tipe */}
            <div>
                <label className="block text-[10px] font-black text-neutral-400 mb-3 uppercase tracking-widest">Tipe Transaksi</label>
                <div className="grid grid-cols-2 gap-4">
                    <label className={`flex items-center justify-center gap-2 p-4 rounded-2xl border cursor-pointer transition-all shadow-sm ${type === "EXPENSE" ? "bg-gradient-to-br from-[#F26076]/20 to-[#F26076]/5 border-[#F26076]/50 text-[#F26076] shadow-[#F26076]/10" : "bg-black/40 border-white/5 text-neutral-400 hover:bg-white/5 hover:border-white/10"}`}>
                        <input
                            type="radio"
                            value="EXPENSE"
                            checked={type === "EXPENSE"}
                            onChange={(e) => setType(e.target.value)}
                            className="hidden"
                        />
                        <span className="text-sm font-black tracking-wide">Pengeluaran</span>
                    </label>
                    <label className={`flex items-center justify-center gap-2 p-4 rounded-2xl border cursor-pointer transition-all shadow-sm ${type === "INCOME" ? "bg-gradient-to-br from-[#458B73]/20 to-[#458B73]/5 border-[#458B73]/50 text-[#458B73] shadow-[#458B73]/10" : "bg-black/40 border-white/5 text-neutral-400 hover:bg-white/5 hover:border-white/10"}`}>
                        <input
                            type="radio"
                            value="INCOME"
                            checked={type === "INCOME"}
                            onChange={(e) => setType(e.target.value)}
                            className="hidden"
                        />
                        <span className="text-sm font-black tracking-wide">Pemasukan</span>
                    </label>
                </div>
            </div>

            {/* Wallet Selection */}
            <div>
                <label className="block text-[10px] font-black text-neutral-400 mb-2 uppercase tracking-widest">Sumber Dana</label>
                <select
                    required
                    value={walletId}
                    onChange={(e) => setWalletId(e.target.value)}
                    className="w-full border border-white/10 rounded-2xl px-5 py-4 text-sm bg-black/40 text-white focus:outline-none focus:ring-2 focus:ring-[#458B73]/50 appearance-none cursor-pointer backdrop-blur-md shadow-inner transition-all hover:bg-black/60"
                >
                    {wallets.length === 0 && <option value="" className="bg-[#252525]">Belum ada wallet</option>}
                    {wallets.map((w) => (
                        <option key={w.id} value={w.id} className="bg-[#252525]">
                            {w.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Kategori */}
            <div>
                <label className="block text-[10px] font-black text-neutral-400 mb-2 uppercase tracking-widest">
                    Kategori
                </label>
                <select
                    required
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className="w-full border border-white/10 rounded-2xl px-5 py-4 text-sm bg-black/40 text-white focus:outline-none focus:ring-2 focus:ring-[#458B73]/50 appearance-none cursor-pointer backdrop-blur-md shadow-inner transition-all hover:bg-black/60"
                >
                    {filteredCategories.length === 0 && <option value="" className="bg-[#252525]">Tidak ada kategori</option>}
                    {filteredCategories.map((c) => (
                        <option key={c} value={c} className="bg-[#252525]">
                            {c}
                        </option>
                    ))}
                </select>
            </div>

            {/* Amount */}
            <div>
                <label className="block text-[10px] font-black text-neutral-400 mb-2 uppercase tracking-widest">Jumlah Saldo</label>
                <div className="relative flex items-center">
                    <span className="absolute left-5 text-neutral-400 font-bold text-lg select-none">Rp</span>
                    <input
                        type="number"
                        required
                        min="1"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full border border-white/10 rounded-2xl pl-14 pr-5 py-4 text-lg font-black bg-black/40 text-white focus:outline-none focus:ring-2 focus:ring-[#458B73]/50 placeholder-neutral-600 backdrop-blur-md shadow-inner transition-all hover:bg-black/60"
                        placeholder="0"
                    />
                </div>
            </div>

            {/* Date */}
            <div>
                <label className="block text-[10px] font-black text-neutral-400 mb-2 uppercase tracking-widest">
                    Tanggal Transaksi
                </label>
                <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold bg-black/40 text-white focus:outline-none focus:ring-2 focus:ring-[#458B73]/50 backdrop-blur-md shadow-inner transition-all hover:bg-black/60"
                    style={{ colorScheme: "dark" }}
                />
            </div>

            {/* Note */}
            <div>
                <label className="block text-[10px] font-black text-neutral-400 mb-2 uppercase tracking-widest">
                    Catatan Khusus <span className="text-neutral-600 font-bold normal-case ml-1">(Opsional)</span>
                </label>
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="w-full border border-white/10 rounded-2xl px-5 py-4 text-sm bg-black/40 text-white focus:outline-none focus:ring-2 focus:ring-[#458B73]/50 placeholder-neutral-600 resize-none backdrop-blur-md shadow-inner transition-all hover:bg-black/60"
                    placeholder="Contoh: Makan siang bareng teman kantor..."
                />
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-3 text-neutral-400 hover:text-white hover:bg-white/10 rounded-2xl transition-all text-sm font-bold"
                >
                    Batal
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-10 py-3 bg-gradient-to-r from-[#458B73] to-emerald-600 text-white rounded-2xl hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-50 transition-all shadow-xl shadow-emerald-900/40 text-sm font-black flex items-center gap-2"
                >
                    {loading ? <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : (initialData ? "Simpan Perubahan" : "Catat Transaksi")}
                </button>
            </div>
        </form>
    );
}
