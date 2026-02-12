"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Wallet = {
    id: string;
    name: string;
};

type Category = {
    id: string;
    name: string;
    type: string;
};

type RecurringData = {
    id: string;
    name: string;
    amount: number;
    type: "INCOME" | "EXPENSE";
    frequency: "DAILY" | "WEEKLY" | "MONTHLY";
    interval: number;
    startDate: string;
    nextRun: string;
    note?: string;
    category: { name: string };
    wallet?: { name: string };
};

type Props = {
    onClose: () => void;
    categories: Category[];
    wallets: Wallet[];
};

export default function RecurringManager({ onClose, categories, wallets }: Props) {
    const router = useRouter();
    const [items, setItems] = useState<RecurringData[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [amount, setAmount] = useState("");
    const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
    const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
    const [walletId, setWalletId] = useState(wallets[0]?.id || "");
    const [frequency, setFrequency] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("MONTHLY");
    const [interval, setInterval] = useState("1");
    const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
    const [note, setNote] = useState("");

    const fetchItems = async () => {
        try {
            const res = await fetch("/api/recurring");
            if (res.ok) {
                const data = await res.json();
                setItems(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !amount || !categoryId || !walletId) return alert("Mohon lengkapi data");

        try {
            const res = await fetch("/api/recurring", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    amount: Number(amount),
                    type,
                    categoryId,
                    walletId,
                    frequency,
                    interval: Number(interval),
                    startDate,
                    note,
                }),
            });

            if (res.ok) {
                setShowForm(false);
                fetchItems();
                router.refresh(); // Refresh dashboard to update potential auto-processed tx
                // Reset form
                setName("");
                setAmount("");
                setNote("");
            } else {
                alert("Gagal menyimpan");
            }
        } catch (e) {
            alert("Terjadi kesalahan");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus aturan ini?")) return;
        try {
            const res = await fetch(`/api/recurring/${id}`, { method: "DELETE" });
            if (res.ok) {
                setItems(items.filter((i) => i.id !== id));
            }
        } catch (e) {
            alert("Gagal menghapus");
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-black">
                    ✕
                </button>
                <h2 className="text-xl font-bold mb-4">Transaksi Berulang</h2>

                {!showForm ? (
                    <>
                        <button
                            onClick={() => setShowForm(true)}
                            className="w-full bg-black text-white py-2 rounded-lg mb-4 hover:bg-gray-800"
                        >
                            + Buat Aturan Baru
                        </button>

                        {loading ? (
                            <p>Loading...</p>
                        ) : items.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">Belum ada aturan transaksi berulang.</p>
                        ) : (
                            <div className="space-y-3">
                                {items.map((item) => (
                                    <div key={item.id} className="border p-4 rounded-xl flex justify-between items-center bg-gray-50">
                                        <div>
                                            <p className="font-semibold">{item.name}</p>
                                            <p className="text-sm text-gray-600">
                                                {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(item.amount)} •{" "}
                                                <span className={item.type === "INCOME" ? "text-green-600" : "text-red-600"}>
                                                    {item.type === "INCOME" ? "Pemasukan" : "Pengeluaran"}
                                                </span>
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {item.frequency} (Setiap {item.interval > 1 ? `${item.interval} ` : ""}
                                                {item.frequency === "DAILY" ? "Hari" : item.frequency === "WEEKLY" ? "Minggu" : "Bulan"})
                                                • Next: {new Date(item.nextRun).toLocaleDateString("id-ID")}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="text-red-500 hover:text-red-700 text-sm px-3 py-1"
                                        >
                                            Hapus
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Nama Transaksi</label>
                            <input
                                required
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full border rounded-lg p-2"
                                placeholder="Contoh: Gaji Bulanan, Bayar Kost"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Tipe</label>
                                <div className="flex bg-gray-100 rounded-lg p-1">
                                    <button
                                        type="button"
                                        onClick={() => setType("INCOME")}
                                        className={`flex-1 py-1 rounded-md text-sm ${type === "INCOME" ? "bg-white shadow text-green-600" : "text-gray-500"
                                            }`}
                                    >
                                        Pemasukan
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setType("EXPENSE")}
                                        className={`flex-1 py-1 rounded-md text-sm ${type === "EXPENSE" ? "bg-white shadow text-red-600" : "text-gray-500"
                                            }`}
                                    >
                                        Pengeluaran
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Jumlah (Rp)</label>
                                <input
                                    required
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full border rounded-lg p-2"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Kategori</label>
                                <select
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    className="w-full border rounded-lg p-2"
                                >
                                    {categories
                                        .filter((c) => c.type === type)
                                        .map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Wallet</label>
                                <select
                                    value={walletId}
                                    onChange={(e) => setWalletId(e.target.value)}
                                    className="w-full border rounded-lg p-2"
                                >
                                    {wallets.map((w) => (
                                        <option key={w.id} value={w.id}>
                                            {w.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="border-t pt-4 mt-2">
                            <h3 className="font-semibold mb-3">Aturan Pengulangan</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Frekuensi</label>
                                    <select
                                        value={frequency}
                                        onChange={(e) => setFrequency(e.target.value as any)}
                                        className="w-full border rounded-lg p-2"
                                    >
                                        <option value="DAILY">Harian</option>
                                        <option value="WEEKLY">Mingguan</option>
                                        <option value="MONTHLY">Bulanan</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Interval</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-500">Setiap</span>
                                        <input
                                            type="number"
                                            min="1"
                                            value={interval}
                                            onChange={(e) => setInterval(e.target.value)}
                                            className="w-16 border rounded-lg p-2 text-center"
                                        />
                                        <span className="text-sm text-gray-500">
                                            {frequency === "DAILY" ? "Hari" : frequency === "WEEKLY" ? "Minggu" : "Bulan"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium mb-1">Mulai Tanggal</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full border rounded-lg p-2"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Transaksi pertama akan dibuat pada tanggal ini (atau tanggal berikutnya sesuai interval jika sudah lewat).
                                </p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Catatan (Opsional)</label>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="w-full border rounded-lg p-2 h-20"
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Simpan Aturan
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
