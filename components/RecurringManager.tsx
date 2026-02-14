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
            <div className="bg-[#252525] p-6 rounded-3xl border border-white/5 shadow-lg">
                <button onClick={() => setIsFormOpen(false)} className="mb-4 text-sm text-neutral-400 hover:text-white transition-colors">← Kembali</button>
                <h3 className="font-bold mb-4 text-white">{editingItem ? "Edit Rutinitas" : "Buat Rutinitas Baru"}</h3>
                <RecurringForm onClose={handleFormClose} categories={categories} wallets={wallets} initialData={editingItem} />
            </div>
        );
    }

    return (
        <div className="p-6 rounded-3xl bg-[#252525] border border-white/5 shadow-lg flex flex-col h-full relative overflow-hidden group">
            <div className="flex justify-between items-center mb-4 relative z-10">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <span className="text-xl">🔄</span> Rutinitas
                </h3>
                <button
                    onClick={() => { setEditingItem(null); setIsFormOpen(true); }}
                    className="text-xs p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
                >
                    + Baru
                </button>
            </div>

            {loading ? (
                <div className="text-center py-4 text-sm text-neutral-500">Loading...</div>
            ) : (
                <div className="space-y-3 overflow-y-auto custom-scrollbar relative z-10 pr-1 flex-1">
                    {items.length === 0 && <p className="text-center text-xs text-neutral-500 py-4">Belum ada rutinitas.</p>}
                    {items.map(item => (
                        <div key={item.id} className="border border-white/5 rounded-xl p-3 hover:bg-white/5 transition-all bg-black/20 relative group">
                            <div className="flex justify-between mb-1">
                                <p className="font-bold text-sm text-white truncate">{item.name}</p>
                                <p className="font-bold text-sm" style={{ color: item.type === 'INCOME' ? '#458B73' : '#F26076' }}>
                                    {formatCurrency(item.amount)}
                                </p>
                            </div>
                            <div className="text-[10px] text-neutral-400 font-mono flex flex-col gap-1">
                                <div className="flex justify-between">
                                    <span>{item.category?.name} • {item.wallet?.name}</span>
                                    <span>{getFrequencyText(item)}</span>
                                </div>
                                <div className="flex justify-between items-end mt-1">
                                    <span className="text-white/50">Next: {new Date(item.nextRun).toLocaleDateString("id-ID", { day: 'numeric', month: 'short' })}</span>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                        <button onClick={() => { setEditingItem(item); setIsFormOpen(true); }} className="p-1 hover:bg-white/10 rounded text-[#FF9760]">✏️</button>
                                        <button onClick={() => handleDelete(item.id)} className="p-1 hover:bg-white/10 rounded text-[#F26076]">🗑️</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
