"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Matches usage in DashboardClient
type Props = {
    categories: { id: string; name: string; type: string }[];
    initialData?: { id?: string; categoryId: string; limitAmount: number; period?: string } | null;
    onClose: () => void;
};

export default function BudgetForm({ categories, initialData, onClose }: Props) {
    const router = useRouter();
    const [categoryId, setCategoryId] = useState(initialData?.categoryId || "");
    const [limitAmount, setLimitAmount] = useState(initialData?.limitAmount || "");
    const [period, setPeriod] = useState(initialData?.period || "MONTHLY");
    const [loading, setLoading] = useState(false);

    // Filter only expense categories
    const expenseCategories = categories.filter(c => c.type === "EXPENSE");

    useEffect(() => {
        if (!categoryId && expenseCategories.length > 0) {
            setCategoryId(expenseCategories[0].id);
        }
    }, [categoryId, expenseCategories]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = initialData?.id ? `/api/budgets/${initialData.id}` : "/api/budgets";
            const method = initialData?.id ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    categoryId,
                    limitAmount: Number(limitAmount),
                    period,
                }),
            });

            if (res.ok) {
                router.refresh();
                onClose();
            } else {
                alert("Gagal menyimpan budget");
            }
        } catch {
            alert("Error");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!initialData?.id || !confirm("Hapus budget ini?")) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/budgets/${initialData.id}`, { method: "DELETE" });
            if (res.ok) {
                router.refresh();
                onClose();
            } else alert("Gagal menghapus");
        } catch {
            alert("Error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wide">Kategori</label>
                <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full border border-white/10 rounded-xl px-4 py-3 text-sm bg-black/20 text-white focus:outline-none focus:ring-1 focus:ring-[#458B73] appearance-none"
                    disabled={!!initialData?.id} // Disable changing category on edit usually safer
                >
                    {expenseCategories.map(c => (
                        <option key={c.id} value={c.id} className="bg-[#252525]">{c.name}</option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wide">Limit Budget</label>
                <div className="relative">
                    <span className="absolute left-4 top-3 text-neutral-500 text-sm">Rp</span>
                    <input
                        type="number"
                        value={limitAmount}
                        onChange={(e) => setLimitAmount(e.target.value)}
                        className="w-full border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm bg-black/20 text-white focus:outline-none focus:ring-1 focus:ring-[#458B73] placeholder-neutral-600"
                        placeholder="Contoh: 1000000"
                        required
                        min="1"
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wide">Periode</label>
                <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="w-full border border-white/10 rounded-xl px-4 py-3 text-sm bg-black/20 text-white focus:outline-none focus:ring-1 focus:ring-[#458B73] appearance-none"
                >
                    <option value="MONTHLY" className="bg-[#252525]">Bulanan</option>
                    <option value="WEEKLY" className="bg-[#252525]">Mingguan</option>
                </select>
            </div>

            <div className="flex gap-3 pt-4 border-t border-white/5">
                {initialData?.id && (
                    <button type="button" onClick={handleDelete} disabled={loading} className="px-5 py-2.5 text-[#F26076] bg-[#F26076]/10 rounded-xl text-sm font-bold hover:bg-[#F26076]/20 transition-colors">
                        Hapus
                    </button>
                )}
                <button type="submit" disabled={loading} className="flex-1 bg-[#458B73] text-white py-2.5 rounded-xl text-sm font-bold hover:bg-[#3aa381] disabled:opacity-50 transition-all shadow-lg hover:shadow-[#458B73]/20">
                    {loading ? "Menyimpan..." : "Simpan Budget"}
                </button>
            </div>
        </form>
    );
}
