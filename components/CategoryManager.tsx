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
            <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
                <select value={type} onChange={(e) => setType(e.target.value)}
                    className="border border-white/10 rounded-xl px-4 py-3 text-sm bg-black/20 text-white focus:outline-none focus:ring-1 focus:ring-[#458B73] appearance-none cursor-pointer">
                    <option value="EXPENSE">Pengeluaran</option>
                    <option value="INCOME">Pemasukan</option>
                </select>
                <input
                    type="text"
                    placeholder="Nama Kategori Baru..."
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="flex-1 w-full border border-white/10 rounded-xl px-4 py-3 text-sm bg-black/20 text-white focus:outline-none focus:ring-1 focus:ring-[#458B73] placeholder-neutral-500"
                    required
                />
                <button type="submit" disabled={loading} className="bg-[#458B73] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#3aa381] disabled:opacity-50 transition-all shadow-lg hover:shadow-[#458B73]/20 w-full sm:w-auto">
                    {loading ? "..." : "+ Tambah"}
                </button>
            </form>

            <div className="space-y-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                <div>
                    <h4 className="text-xs font-bold text-[#F26076] uppercase tracking-wider mb-3">Pengeluaran</h4>
                    <div className="flex flex-wrap gap-2">
                        {categories.filter(c => c.type === "EXPENSE").map(c => (
                            <div key={c.id} className="group flex items-center gap-2 pl-3 pr-2 py-1.5 bg-black/20 rounded-lg border border-white/5 hover:border-white/10 text-sm text-neutral-300 hover:text-white transition-all">
                                <span>{c.name}</span>
                                <button onClick={() => handleDelete(c.id, c.name)} className="text-neutral-600 hover:text-[#F26076] opacity-0 group-hover:opacity-100 transition-all ml-1 w-5 h-5 flex items-center justify-center rounded hover:bg-[#F26076]/10">×</button>
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    <h4 className="text-xs font-bold text-[#458B73] uppercase tracking-wider mb-3">Pemasukan</h4>
                    <div className="flex flex-wrap gap-2">
                        {categories.filter(c => c.type === "INCOME").map(c => (
                            <div key={c.id} className="group flex items-center gap-2 pl-3 pr-2 py-1.5 bg-black/20 rounded-lg border border-white/5 hover:border-white/10 text-sm text-neutral-300 hover:text-white transition-all">
                                <span>{c.name}</span>
                                <button onClick={() => handleDelete(c.id, c.name)} className="text-neutral-600 hover:text-[#F26076] opacity-0 group-hover:opacity-100 transition-all ml-1 w-5 h-5 flex items-center justify-center rounded hover:bg-[#F26076]/10">×</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
