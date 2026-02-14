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
    categoryObjects: { id: string; name: string; type: string }[];
    wallets: Wallet[];
};

export default function TransactionForm({
    categories,
    initialData,
    onClose,
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

            if (!res.ok) throw new Error("Gagal menyimpan");

            router.refresh();
            onClose();
        } catch (error) {
            console.error(error);
            alert("Terjadi kesalahan");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* Tipe */}
            <div>
                <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wide">Tipe Transaksi</label>
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
            </div>

            {/* Wallet Selection */}
            <div>
                <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wide">Sumber Dana</label>
                <select
                    required
                    value={walletId}
                    onChange={(e) => setWalletId(e.target.value)}
                    className="w-full border border-white/10 rounded-xl px-4 py-3 text-sm bg-black/20 text-white focus:outline-none focus:ring-1 focus:ring-[#458B73] appearance-none cursor-pointer"
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
                <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wide">
                    Kategori
                </label>
                <select
                    required
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className="w-full border border-white/10 rounded-xl px-4 py-3 text-sm bg-black/20 text-white focus:outline-none focus:ring-1 focus:ring-[#458B73] appearance-none cursor-pointer"
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
                <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wide">Jumlah</label>
                <div className="relative">
                    <span className="absolute left-4 top-3 text-neutral-500 text-sm">Rp</span>
                    <input
                        type="number"
                        required
                        min="1"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm bg-black/20 text-white focus:outline-none focus:ring-1 focus:ring-[#458B73] placeholder-neutral-600"
                        placeholder="0"
                    />
                </div>
            </div>

            {/* Date */}
            <div>
                <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wide">
                    Tanggal
                </label>
                <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border border-white/10 rounded-xl px-4 py-3 text-sm bg-black/20 text-white focus:outline-none focus:ring-1 focus:ring-[#458B73]"
                    style={{ colorScheme: "dark" }}
                />
            </div>

            {/* Note */}
            <div>
                <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wide">
                    Catatan <span className="text-neutral-600 font-normal normal-case">(Opsional)</span>
                </label>
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="w-full border border-white/10 rounded-xl px-4 py-3 text-sm bg-black/20 text-white focus:outline-none focus:ring-1 focus:ring-[#458B73] placeholder-neutral-600 resize-none"
                    placeholder="Contoh: Makan siang di warteg..."
                />
            </div>


            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2.5 text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors text-sm font-medium"
                >
                    Batal
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-2.5 bg-[#458B73] text-white rounded-xl hover:bg-[#3aa381] disabled:opacity-50 transition-all shadow-lg hover:shadow-[#458B73]/20 text-sm font-bold"
                >
                    {loading ? "Menyimpan..." : "Simpan"}
                </button>
            </div>
        </form>
    );
}
