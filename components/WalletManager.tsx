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
        if (!confirm("Hapus wallet ini? Transaksi terkait tidak akan terhapus tapi jadi orphan.")) return;
        // TODO: Implement delete API
        alert("Fitur hapus belum diimplementasikan di API (safety reason)");
    };

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

    return (
        <div className="space-y-4">
            <div className="flex gap-2 border-b pb-2">
                <button
                    onClick={() => setActiveTab("LIST")}
                    className={`px-3 py-1 rounded text-sm ${activeTab === "LIST" ? "bg-gray-100 font-medium" : "text-gray-500"}`}
                >
                    Daftar Wallet
                </button>
                <button
                    onClick={() => setActiveTab("ADD")}
                    className={`px-3 py-1 rounded text-sm ${activeTab === "ADD" ? "bg-gray-100 font-medium" : "text-gray-500"}`}
                >
                    + Tambah Wallet
                </button>
            </div>

            {activeTab === "LIST" && (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {(wallets || []).map((w) => (
                        <div key={w.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50">
                            <div>
                                <p className="font-medium">{w.name}</p>
                                <p className="text-xs text-gray-500">{w.type} • Initial: {formatCurrency(w.initialBalance)}</p>
                            </div>
                            {/* <button onClick={() => handleDelete(w.id)} className="text-red-500 text-xs">Hapus</button> */}
                        </div>
                    ))}
                    {(wallets || []).length === 0 && <p className="text-center text-gray-500 text-sm py-4">Belum ada wallet.</p>}
                </div>
            )}

            {activeTab === "ADD" && (
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium">Nama Wallet</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full border p-2 rounded"
                            placeholder="Contoh: Dompet Saku, BCA Utama"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Tipe</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value as any)}
                            className="w-full border p-2 rounded"
                        >
                            <option value="CASH">Tunai</option>
                            <option value="BANK">Bank Transfer</option>
                            <option value="EWALLET">E-Wallet (Gopay/OVO/dll)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Saldo Awal (Opsional)</label>
                        <input
                            type="number"
                            value={initialBalance}
                            onChange={(e) => setInitialBalance(e.target.value)}
                            className="w-full border p-2 rounded"
                            placeholder="0"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-black text-white py-2 rounded hover:bg-gray-800 disabled:opacity-50"
                    >
                        {loading ? "Menyimpan..." : "Simpan Wallet"}
                    </button>
                </form>
            )}
        </div>
    );
}
