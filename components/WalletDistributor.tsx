"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Wallet = {
    id: string;
    name: string;
    type: "CASH" | "BANK" | "EWALLET";
    initialBalance: number;
};

type Props = {
    wallets: Wallet[];
    totalBalance: number;
    onClose: () => void;
};

const currency = (value: number) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(value);

export default function WalletDistributor({ wallets, totalBalance, onClose }: Props) {
    const router = useRouter();
    const [allocations, setAllocations] = useState<Record<string, string>>(
        Object.fromEntries(wallets.map(w => [w.id, String(w.initialBalance)]))
    );
    const [loading, setLoading] = useState(false);
    const [newName, setNewName] = useState("");
    const [newType, setNewType] = useState<"CASH" | "BANK" | "EWALLET">("CASH");
    const [showAdd, setShowAdd] = useState(false);

    const totalAllocated = Object.values(allocations).reduce((sum, v) => sum + (Number(v) || 0), 0);
    const unallocated = totalBalance - totalAllocated;

    const handleSave = async () => {
        setLoading(true);
        try {
            for (const w of wallets) {
                const amount = Number(allocations[w.id]) || 0;
                if (amount !== w.initialBalance) {
                    await fetch(`/api/wallets/${w.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ initialBalance: amount }),
                    });
                }
            }
            router.refresh();
            onClose();
        } catch { alert("Terjadi kesalahan"); }
        finally { setLoading(false); }
    };

    const handleAddWallet = async () => {
        if (!newName) return;
        setLoading(true);
        try {
            const res = await fetch("/api/wallets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newName, type: newType, initialBalance: 0 }),
            });
            if (res.ok) {
                setNewName("");
                setShowAdd(false);
                router.refresh();
            } else alert("Gagal menambah wallet");
        } catch { alert("Terjadi kesalahan"); }
        finally { setLoading(false); }
    };

    const handleDeleteWallet = async (id: string, name: string) => {
        if (!confirm(`Hapus wallet "${name}"? Transaksi yang terkait akan kehilangan referensi wallet.`)) return;
        try {
            const res = await fetch(`/api/wallets/${id}`, { method: "DELETE" });
            if (res.ok) router.refresh();
            else alert("Gagal menghapus wallet");
        } catch { alert("Terjadi kesalahan"); }
    };

    return (
        <div className="space-y-5">
            {/* Total */}
            <div className="p-4 rounded-xl" style={{ background: "rgba(69,139,115,0.08)" }}>
                <p className="text-sm text-gray-500 mb-1">Total Saldo</p>
                <p className="text-2xl font-bold" style={{ color: "#458B73" }}>{currency(totalBalance)}</p>
            </div>

            {/* Allocation per wallet */}
            <div className="space-y-3">
                {wallets.map(w => (
                    <div key={w.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <p className="font-semibold text-sm text-gray-800 truncate">{w.name}</p>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{w.type}</span>
                            </div>
                        </div>
                        <input
                            type="number"
                            value={allocations[w.id] || ""}
                            onChange={(e) => setAllocations(prev => ({ ...prev, [w.id]: e.target.value }))}
                            className="w-40 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#458B73] focus:border-transparent"
                            placeholder="0"
                        />
                        <button onClick={() => handleDeleteWallet(w.id, w.name)}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 cursor-pointer text-sm flex-shrink-0">✕</button>
                    </div>
                ))}
            </div>

            {/* Unallocated */}
            <div className="flex justify-between items-center p-3 rounded-xl border border-dashed border-gray-200 text-sm">
                <span className="text-gray-500">Saldo Utama (belum dialokasi)</span>
                <span className="font-bold" style={{ color: unallocated >= 0 ? "#458B73" : "#F26076" }}>{currency(unallocated)}</span>
            </div>
            {unallocated < 0 && (
                <p className="text-xs text-red-500">⚠️ Alokasi melebihi total saldo!</p>
            )}

            {/* Add new wallet */}
            {showAdd ? (
                <div className="p-3 rounded-xl border border-gray-200 space-y-2">
                    <input type="text" placeholder="Nama wallet" value={newName} onChange={(e) => setNewName(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#458B73]" />
                    <select value={newType} onChange={(e) => setNewType(e.target.value as "CASH" | "BANK" | "EWALLET")}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                        <option value="CASH">Cash / Tunai</option>
                        <option value="BANK">Rekening Bank</option>
                        <option value="EWALLET">E-Wallet</option>
                    </select>
                    <div className="flex gap-2">
                        <button onClick={handleAddWallet} disabled={!newName || loading}
                            className="flex-1 py-2 rounded-lg text-sm font-medium text-white cursor-pointer disabled:opacity-50" style={{ background: "#458B73" }}>Tambah</button>
                        <button onClick={() => setShowAdd(false)}
                            className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 cursor-pointer">Batal</button>
                    </div>
                </div>
            ) : (
                <button onClick={() => setShowAdd(true)}
                    className="w-full py-2 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 cursor-pointer">+ Tambah Wallet Baru</button>
            )}

            {/* Save */}
            <button onClick={handleSave} disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white cursor-pointer disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #458B73, #458B73dd)" }}>
                {loading ? "Menyimpan..." : "Simpan Alokasi"}
            </button>
        </div>
    );
}
