"use client";

import { useState, useEffect } from "react";
import RecurringForm from "./RecurringForm";

type Props = {
    categories: { id: string; name: string; type: string }[];
    wallets: { id: string; name: string }[];
};

export default function RecurringManager({ categories, wallets }: Props) {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/recurring");
            if (res.ok) {
                const data = await res.json();
                setItems(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus rutinitas ini?")) return;
        try {
            await fetch(`/api/recurring/${id}`, { method: "DELETE" });
            fetchItems();
        } catch (error) {
            alert("Gagal menghapus");
        }
    };

    const handleFormClose = () => {
        setIsFormOpen(false);
        setEditingItem(null);
        fetchItems(); // refresh list
    };

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

    const getFrequencyText = (item: any) => {
        const interval = item.interval > 1 ? `Setiap ${item.interval} ` : "Setiap ";
        const freq = item.frequency === "DAILY" ? "Hari" : item.frequency === "WEEKLY" ? "Minggu" : "Bulan";
        return interval + freq;
    };

    if (isFormOpen) {
        return (
            <div>
                <button onClick={() => setIsFormOpen(false)} className="mb-4 text-sm text-gray-600 hover:text-white dark:text-gray-400 dark:hover:text-gray-200 transition-colors">← Kembali</button>
                <h3 className="font-bold mb-4 text-white dark:text-white">{editingItem ? "Edit Rutinitas" : "Buat Rutinitas Baru"}</h3>
                <RecurringForm onClose={handleFormClose} categories={categories} wallets={wallets} initialData={editingItem} />
            </div>
        );
    }

    return (
        <div className="p-8 rounded-2xl bg-white dark:bg-gray-800 card-fix shadow-sm border border-gray-100 dark:border-gray-700 mt-8 transition-colors duration-300">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-extrabold text-xl text-white dark:text-white">🔄 Rutinitas</h3>
                <button
                    onClick={() => { setEditingItem(null); setIsFormOpen(true); }}
                    className="text-sm px-5 py-2.5 rounded-xl font-medium cursor-pointer border-2 border-dashed border-[#458B73]/50 text-[#458B73] hover:border-[#458B73] hover:bg-[#458B73]/5 transition-colors"
                >
                    + Buat Rutinitas
                </button>
            </div>

            {loading ? (
                <div className="text-center py-4 text-sm text-gray-400">Loading...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.length === 0 && <p className="col-span-full text-center text-sm text-white py-4">Belum ada rutinitas yang diatur.</p>}
                    {items.map(item => (
                        <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-all bg-white dark:bg-gray-800 card-fix relative group">
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <button onClick={() => { setEditingItem(item); setIsFormOpen(true); }} className="p-1 hover:bg-[#FF9760]/10 rounded text-xs text-[#FF9760]">✏️</button>
                                <button onClick={() => handleDelete(item.id)} className="p-1 hover:bg-[#F26076]/10 rounded text-xs text-[#F26076]">🗑️</button>
                            </div>
                            <div className="flex justify-between mb-2">
                                <p className="font-bold text-white dark:text-gray-200 truncate">{item.name}</p>
                                <p className="font-bold" style={{ color: item.type === 'INCOME' ? '#458B73' : '#F26076' }}>
                                    {formatCurrency(item.amount)}
                                </p>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                <p>📁 {item.category?.name}</p>
                                <p>💼 {item.wallet?.name}</p>
                                <p>⏱️ {getFrequencyText(item)}</p>
                                <p className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-600 text-white dark:text-white">Next: {new Date(item.nextRun).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
