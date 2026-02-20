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

    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Hapus kategori "${name}"?`)) return;
        setDeletingId(id);

        try {
            const res = await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
            if (res.ok) {
                router.refresh();
            } else {
                alert("Gagal menghapus");
            }
        } catch {
            alert("Error");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-8">
            <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-4">
                <select value={type} onChange={(e) => setType(e.target.value)}
                    className="border border-white/10 rounded-2xl px-5 py-4 text-sm bg-black/40 text-white focus:outline-none focus:ring-2 focus:ring-[#458B73]/50 appearance-none cursor-pointer backdrop-blur-md shadow-inner transition-all hover:bg-black/60">
                    <option value="EXPENSE">Pengeluaran</option>
                    <option value="INCOME">Pemasukan</option>
                </select>
                <div className="flex-1 relative">
                    <input
                        type="text"
                        placeholder="Nama Kategori Baru..."
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="w-full border border-white/10 rounded-2xl px-5 py-4 text-sm bg-black/40 text-white focus:outline-none focus:ring-2 focus:ring-[#458B73]/50 placeholder-neutral-500 backdrop-blur-md shadow-inner transition-all hover:bg-black/60"
                        required
                    />
                </div>
                <button type="submit" disabled={loading} className="bg-gradient-to-r from-[#458B73] to-emerald-600 text-white px-8 py-4 rounded-2xl text-sm font-black hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-50 transition-all shadow-lg shadow-emerald-900/40 w-full sm:w-auto flex justify-center items-center">
                    {loading ? <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : "+ Tambah"}
                </button>
            </form>

            <div className="space-y-6 max-h-[350px] overflow-y-auto pr-3 custom-scrollbar relative">
                <div className="p-6 rounded-3xl bg-black/20 border border-white/5 backdrop-blur-md relative overflow-hidden group hover:border-[#F26076]/30 transition-all">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#F26076]/10 rounded-full blur-[40px] pointer-events-none" />
                    <h4 className="flex items-center gap-2 text-xs font-black text-[#F26076] uppercase tracking-widest mb-4 relative z-10">
                        <span className="w-5 h-5 flex items-center justify-center bg-[#F26076]/20 rounded-full text-[10px]">↑</span> Pengeluaran
                    </h4>
                    <div className="flex flex-wrap gap-3 relative z-10">
                        {categories.filter(c => c.type === "EXPENSE").map(c => (
                            <div key={c.id} className="group/item flex items-center gap-2 pl-4 pr-2 py-2 bg-gradient-to-br from-[#2a2a2a] to-[#252525] rounded-xl border border-white/5 hover:border-white/20 text-sm font-bold text-neutral-300 hover:text-white transition-all shadow-md">
                                <span>{c.name}</span>
                                <button
                                    onClick={() => handleDelete(c.id, c.name)}
                                    disabled={deletingId === c.id}
                                    className="text-neutral-500 hover:text-white hover:bg-[#F26076] transition-all ml-1 w-6 h-6 flex items-center justify-center rounded-lg disabled:opacity-50"
                                >
                                    {deletingId === c.id ? (
                                        <svg className="animate-spin h-3 w-3 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    ) : "×"}
                                </button>
                            </div>
                        ))}
                        {categories.filter(c => c.type === "EXPENSE").length === 0 && <span className="text-xs text-neutral-500">Kosong</span>}
                    </div>
                </div>

                <div className="p-6 rounded-3xl bg-black/20 border border-white/5 backdrop-blur-md relative overflow-hidden group hover:border-[#458B73]/30 transition-all">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#458B73]/10 rounded-full blur-[40px] pointer-events-none" />
                    <h4 className="flex items-center gap-2 text-xs font-black text-[#458B73] uppercase tracking-widest mb-4 relative z-10">
                        <span className="w-5 h-5 flex items-center justify-center bg-[#458B73]/20 rounded-full text-[10px]">↓</span> Pemasukan
                    </h4>
                    <div className="flex flex-wrap gap-3 relative z-10">
                        {categories.filter(c => c.type === "INCOME").map(c => (
                            <div key={c.id} className="group/item flex items-center gap-2 pl-4 pr-2 py-2 bg-gradient-to-br from-[#2a2a2a] to-[#252525] rounded-xl border border-white/5 hover:border-white/20 text-sm font-bold text-neutral-300 hover:text-white transition-all shadow-md">
                                <span>{c.name}</span>
                                <button
                                    onClick={() => handleDelete(c.id, c.name)}
                                    disabled={deletingId === c.id}
                                    className="text-neutral-500 hover:text-white hover:bg-[#F26076] transition-all ml-1 w-6 h-6 flex items-center justify-center rounded-lg disabled:opacity-50"
                                >
                                    {deletingId === c.id ? (
                                        <svg className="animate-spin h-3 w-3 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    ) : "×"}
                                </button>
                            </div>
                        ))}
                        {categories.filter(c => c.type === "INCOME").length === 0 && <span className="text-xs text-neutral-500">Kosong</span>}
                    </div>
                </div>
            </div>
        </div>
    );
}
