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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipe</label>
                <div className="flex gap-4 mt-1">
                    <label className="flex items-center text-white dark:text-gray-200 cursor-pointer">
                        <input
                            type="radio"
                            value="EXPENSE"
                            checked={type === "EXPENSE"}
                            onChange={(e) => setType(e.target.value)}
                            className="mr-2 accent-[#F26076]"
                        />
                        Pengeluaran
                    </label>
                    <label className="flex items-center text-white dark:text-gray-200 cursor-pointer">
                        <input
                            type="radio"
                            value="INCOME"
                            checked={type === "INCOME"}
                            onChange={(e) => setType(e.target.value)}
                            className="mr-2 accent-[#458B73]"
                        />
                        Pemasukan
                    </label>
                </div>
            </div>

            {/* Wallet Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sumber Dana (Wallet)</label>
                <select
                    required
                    value={walletId}
                    onChange={(e) => setWalletId(e.target.value)}
                    className="mt-1 block w-full border rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Kategori
                </label>
                <select
                    required
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className="mt-1 block w-full border rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Jumlah</label>
                <input
                    type="number"
                    required
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 block w-full border rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
            </div>

            {/* Date */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tanggal
                </label>
                <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1 block w-full border rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    style={{ colorScheme: "light dark" }}
                />
            </div>

            {/* Note */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Catatan (Opsional)
                </label>
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="mt-1 block w-full border rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
            </div>


            <div className="flex justify-end gap-2 pt-4">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                >
                    Batal
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-[#458B73] text-white rounded-md hover:bg-[#3aa381] disabled:opacity-50 transition-colors shadow-md shadow-emerald-100"
                >
                    {loading ? "Menyimpan..." : "Simpan"}
                </button>
            </div>
        </form>
    );
}
