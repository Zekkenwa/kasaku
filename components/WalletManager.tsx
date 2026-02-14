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
};

export default function WalletManager({ wallets }: Props) {
    const router = useRouter();
    const [name, setName] = useState("");
    const [type, setType] = useState<"CASH" | "BANK" | "EWALLET">("CASH");
    const [initialBalance, setInitialBalance] = useState("");
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<"LIST" | "ADD">("LIST");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/wallets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    type,
                    initialBalance: Number(initialBalance),
                }),
            });

            if (res.ok) {
                setName("");
                setInitialBalance("");
                setType("CASH");
                setActiveTab("LIST");
                router.refresh();
            } else {
                alert("Gagal membuat wallet");
            }
        } catch (error) {
            alert("Terjadi kesalahan");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus wallet ini? Transaksi terkait tidak akan terhapus tapi jadi orphan (tidak terhubung ke wallet manapun).")) return;

        try {
            const res = await fetch(`/api/wallets/${id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                router.refresh();
            } else {
                alert("Gagal menghapus wallet");
            }
        } catch (error) {
            alert("Terjadi kesalahan saat menghapus");
        }
    };

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

    return (
        <div className="space-y-4">
            <div className="flex gap-2 border-b pb-2">
                <button
                    onClick={() => setActiveTab("LIST")}
                    className={`px-3 py-1 rounded-lg text-sm transition-colors ${activeTab === "LIST" ? "bg-[#458B73]/10 text-[#458B73] font-bold" : "text-gray-700 hover:text-white"}`}
                >
                    Daftar Wallet
                </button>
                <button
                    onClick={() => setActiveTab("ADD")}
                    className={`px-3 py-1 rounded-lg text-sm transition-colors ${activeTab === "ADD" ? "bg-[#458B73]/10 text-[#458B73] font-bold" : "text-gray-700 hover:text-white"}`}
                >
                    + Tambah Wallet
                </button>
            </div>

            {activeTab === "LIST" && (
                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {(wallets || []).map((w) => (
                        <div key={w.id} className="flex justify-between items-center p-3 border border-gray-100 dark:border-gray-700 rounded-xl hover:bg-[#458B73]/5 transition-colors group">
                            <div>
                                <p className="font-medium text-gray-900 dark:text-gray-100">{w.name}</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">{w.type} • Initial: {formatCurrency(w.initialBalance)}</p>
                            </div>
                            <button onClick={() => handleDelete(w.id)} className="text-[#F26076] text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:underline">Hapus</button>
                        </div>
                    ))}
                    {(wallets || []).length === 0 && <p className="text-center text-white text-sm py-4">Belum ada wallet.</p>}
                </div>
            )}

            {activeTab === "ADD" && (
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-900 dark:text-gray-200">Nama Wallet</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full border border-gray-200 dark:border-gray-600 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#458B73] dark:bg-gray-700 dark:text-white"
                            placeholder="Contoh: Dompet Saku, BCA Utama"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-900 dark:text-gray-200">Tipe</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value as any)}
                            className="w-full border border-gray-200 dark:border-gray-600 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#458B73] dark:bg-gray-700 dark:text-white"
                        >
                            <option value="CASH">Tunai</option>
                            <option value="BANK">Bank Transfer</option>
                            <option value="EWALLET">E-Wallet (Gopay/OVO/dll)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-900 dark:text-gray-200">Saldo Awal (Opsional)</label>
                        <input
                            type="number"
                            value={initialBalance}
                            onChange={(e) => setInitialBalance(e.target.value)}
                            className="w-full border border-gray-200 dark:border-gray-600 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#458B73] dark:bg-gray-700 dark:text-white"
                            placeholder="0"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#458B73] text-white py-2 rounded-xl hover:bg-[#3aa381] disabled:opacity-50 shadow-md shadow-emerald-100 transition-colors"
                    >
                        {loading ? "Menyimpan..." : "Simpan Wallet"}
                    </button>
                </form>
            )}
        </div>
    );
}
