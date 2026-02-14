"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
    categories: { id: string; name: string; type: string }[];
};

export default function CategoryManager({ categories }: Props) {
    const router = useRouter();
    const [newCategory, setNewCategory] = useState("");
    const [type, setType] = useState("EXPENSE");
    const [loading, setLoading] = useState(false);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch("/api/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newCategory, type }),
            });
            if (res.ok) {
                setNewCategory("");
                router.refresh();
            } else {
                alert("Gagal menambah kategori");
            }
        } catch {
            alert("Error");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Hapus kategori "${name}"?`)) return;
        try {
            const res = await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
            if (res.ok) router.refresh();
            else alert("Gagal menghapus");
        } catch {
            alert("Error");
        }
    };

    return (
        <div className="space-y-6">
            <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
                <select value={type} onChange={(e) => setType(e.target.value)} className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#458B73]">
                    <option value="EXPENSE">Pengeluaran</option>
                    <option value="INCOME">Pemasukan</option>
                </select>
                <input
                    type="text"
                    placeholder="Nama Kategori Baru..."
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="flex-1 w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#458B73]"
                    required
                />
                <button type="submit" disabled={loading} className="bg-[#458B73] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#3aa381] disabled:opacity-50 transition-colors shadow-sm w-full sm:w-auto">
                    {loading ? "..." : "Tambah"}
                </button>
            </form>

            <div className="space-y-4 max-h-[300px] overflow-y-auto">
                <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wide mb-2">Pengeluaran</h4>
                    <div className="flex flex-wrap gap-2">
                        {categories.filter(c => c.type === "EXPENSE").map(c => (
                            <div key={c.id} className="group flex items-center gap-2 pl-3 pr-2 py-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-700 text-sm dark:text-gray-200">
                                <span>{c.name}</span>
                                <button onClick={() => handleDelete(c.id, c.name)} className="text-white hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wide mb-2">Pemasukan</h4>
                    <div className="flex flex-wrap gap-2">
                        {categories.filter(c => c.type === "INCOME").map(c => (
                            <div key={c.id} className="group flex items-center gap-2 pl-3 pr-2 py-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-700 text-sm dark:text-gray-200">
                                <span>{c.name}</span>
                                <button onClick={() => handleDelete(c.id, c.name)} className="text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
