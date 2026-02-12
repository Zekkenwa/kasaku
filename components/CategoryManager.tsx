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
        if (!newCategory) return;
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
        } catch (error) {
            alert("Terjadi kesalahan");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus kategori ini?")) return;
        try {
            const res = await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
            if (res.ok) router.refresh();
            else alert("Gagal menghapus (menulis mungkin sedang digunakan)");
        } catch (e) {
            alert("Terjadi kesalahan");
        }
    };

    return (
        <div className="space-y-6">
            <form onSubmit={handleAdd} className="flex gap-2 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kategori</label>
                    <input
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="border rounded px-3 py-2 w-48"
                        placeholder="Contoh: Investasi"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipe</label>
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="border rounded px-3 py-2"
                    >
                        <option value="EXPENSE">Pengeluaran</option>
                        <option value="INCOME">Pemasukan</option>
                    </select>
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50"
                >
                    {loading ? "..." : "Tambah"}
                </button>
            </form>

            <div className="space-y-4">
                <div>
                    <h3 className="font-medium text-gray-900 mb-2">Pemasukan</h3>
                    <div className="flex flex-wrap gap-2">
                        {categories.filter(c => c.type === "INCOME").map(c => (
                            <div key={c.id} className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1 rounded-full border border-green-200 text-sm">
                                {c.name}
                                <button onClick={() => handleDelete(c.id)} className="hover:text-green-900">×</button>
                            </div>
                        ))}
                        {categories.filter(c => c.type === "INCOME").length === 0 && <p className="text-sm text-gray-500 italic">Belum ada kategori</p>}
                    </div>
                </div>

                <div>
                    <h3 className="font-medium text-gray-900 mb-2">Pengeluaran</h3>
                    <div className="flex flex-wrap gap-2">
                        {categories.filter(c => c.type === "EXPENSE").map(c => (
                            <div key={c.id} className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1 rounded-full border border-red-200 text-sm">
                                {c.name}
                                <button onClick={() => handleDelete(c.id)} className="hover:text-red-900">×</button>
                            </div>
                        ))}
                        {categories.filter(c => c.type === "EXPENSE").length === 0 && <p className="text-sm text-gray-500 italic">Belum ada kategori</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
