"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
type Wallet = {
    id: string;
    name: string;
};

type Props = {
    categories: string[];
    initialData?: any;
    onClose: () => void;
    categoryObjects: { id: string; name: string; type: string }[];
    wallets: Wallet[];
};

export default function TransactionForm({
    categories,
    initialData,
    onClose,
    categoryObjects,
    wallets,
}: Props) {
    const router = useRouter();
    const [type, setType] = useState(initialData?.type || "EXPENSE");
    const [amount, setAmount] = useState(initialData?.amount || "");
    const [categoryName, setCategoryName] = useState(
        initialData?.category || (categories.length > 0 ? categories[0] : "")
    );
    const [note, setNote] = useState(initialData?.note || "");
    const [date, setDate] = useState(
        initialData?.date || new Date().toISOString().slice(0, 10)
    );
    const [walletId, setWalletId] = useState(initialData?.walletId || (wallets.length > 0 ? wallets[0].id : ""));
    const [loading, setLoading] = useState(false);

    // ... (useEffect for categoryName)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const categoryId = categoryObjects.find((c) => c.name === categoryName)?.id;

        if (!categoryId) {
            alert("Kategori tidak valid");
            setLoading(false);
            return;
        }

        if (!walletId) {
            alert("Wallet harus dipilih");
            setLoading(false);
            return;
        }

        try {
            const url = initialData
                ? `/api/transactions/${initialData.id}`
                : "/api/transactions";
            const method = initialData ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type,
                    amount,
                    categoryId,
                    note,
                    date,
                    walletId,
                }),
            });

            if (!res.ok) throw new Error("Gagal menyimpan");

            router.refresh();
            onClose();
        } catch (error) {
            console.error(error);
            alert("Terjadi kesalahan");
        } finally {
            setLoading(false);
        }
    };

    const filteredCategories = categoryObjects.filter(c => c.type === type).map(c => c.name);

    useEffect(() => {
        if (!filteredCategories.includes(categoryName) && filteredCategories.length > 0) {
            setCategoryName(filteredCategories[0]);
        }
    }, [type, filteredCategories, categoryName]);

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tipe */}
            <div>
                <label className="block text-sm font-medium text-gray-700">Tipe</label>
                <div className="flex gap-4 mt-1">
                    <label className="flex items-center">
                        <input
                            type="radio"
                            value="EXPENSE"
                            checked={type === "EXPENSE"}
                            onChange={(e) => setType(e.target.value)}
                            className="mr-2"
                        />
                        Pengeluaran
                    </label>
                    <label className="flex items-center">
                        <input
                            type="radio"
                            value="INCOME"
                            checked={type === "INCOME"}
                            onChange={(e) => setType(e.target.value)}
                            className="mr-2"
                        />
                        Pemasukan
                    </label>
                </div>
            </div>

            {/* Wallet Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-700">Sumber Dana (Wallet)</label>
                <select
                    required
                    value={walletId}
                    onChange={(e) => setWalletId(e.target.value)}
                    className="mt-1 block w-full border rounded-md px-3 py-2"
                >
                    {wallets.length === 0 && <option value="">Belum ada wallet</option>}
                    {wallets.map((w) => (
                        <option key={w.id} value={w.id}>
                            {w.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Kategori */}
            <div>
                <label className="block text-sm font-medium text-gray-700">
                    Kategori
                </label>
                <select
                    required
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className="mt-1 block w-full border rounded-md px-3 py-2"
                >
                    {filteredCategories.length === 0 && <option value="">Tidak ada kategori</option>}
                    {filteredCategories.map((c) => (
                        <option key={c} value={c}>
                            {c}
                        </option>
                    ))}
                </select>
            </div>

            {/* Amount */}
            <div>
                <label className="block text-sm font-medium text-gray-700">Jumlah</label>
                <input
                    type="number"
                    required
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 block w-full border rounded-md px-3 py-2"
                />
            </div>

            {/* Date */}
            <div>
                <label className="block text-sm font-medium text-gray-700">
                    Tanggal
                </label>
                <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1 block w-full border rounded-md px-3 py-2"
                />
            </div>

            {/* Note */}
            <div>
                <label className="block text-sm font-medium text-gray-700">
                    Catatan (Opsional)
                </label>
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="mt-1 block w-full border rounded-md px-3 py-2"
                />
            </div>


            <div className="flex justify-end gap-2 pt-4">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                >
                    Batal
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
                >
                    {loading ? "Menyimpan..." : "Simpan"}
                </button>
            </div>
        </form>
    );
}
