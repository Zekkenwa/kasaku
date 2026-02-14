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
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Kategori</label>
                <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full border rounded-lg p-2.5 text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    disabled={!!initialData?.id} // Disable changing category on edit usually safer
                >
                    {expenseCategories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Limit Budget</label>
                <input
                    type="number"
                    value={limitAmount}
                    onChange={(e) => setLimitAmount(e.target.value)}
                    className="w-full border rounded-lg p-2.5 text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Contoh: 1000000"
                    required
                    min="1"
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Periode</label>
                <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="w-full border rounded-lg p-2.5 text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                    <option value="MONTHLY">Bulanan</option>
                    <option value="WEEKLY">Mingguan</option>
                </select>
            </div>

            <div className="flex gap-2 pt-2">
                {initialData?.id && (
                    <button type="button" onClick={handleDelete} disabled={loading} className="px-4 py-2.5 text-red-500 bg-red-50 dark:bg-red-900/30 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/50">
                        Hapus
                    </button>
                )}
                <button type="submit" disabled={loading} className="flex-1 bg-black dark:bg-[#458B73] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-[#3aa381] disabled:opacity-50 transition-colors">
                    {loading ? "Menyimpan..." : "Simpan Budget"}
                </button>
            </div>
        </form>
    );
}
