"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
    initialData?: any;
    onClose: () => void;
    defaultType?: "PAYABLE" | "RECEIVABLE";
};

export default function LoanForm({ initialData, onClose, defaultType }: Props) {
    const router = useRouter();
    const [name, setName] = useState(initialData?.name || "");
    const [amount, setAmount] = useState(initialData?.amount || "");
    const [hasDueDate, setHasDueDate] = useState(
        initialData ? !!initialData.dueDate && !initialData.dueDate?.includes?.('2099') : true
    );
    const [dueDate, setDueDate] = useState(
        initialData?.dueDate || new Date().toISOString().slice(0, 10)
    );
    const [status, setStatus] = useState(initialData?.status || "ONGOING");
    const [type, setType] = useState<"PAYABLE" | "RECEIVABLE">(initialData?.type || defaultType || "PAYABLE");
    const [isNew, setIsNew] = useState(true); // hutang/piutang baru vs lama
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = initialData
                ? `/api/loans/${initialData.id}`
                : "/api/loans";
            const method = initialData ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    amount,
                    dueDate: hasDueDate ? dueDate : null,
                    status,
                    type,
                    isNew: !initialData ? isNew : undefined, // only on create
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

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type selector */}
            <div>
                <label className="block text-sm font-medium text-white dark:text-gray-300">Tipe</label>
                <div className="flex gap-3 mt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer text-gray-900 dark:text-gray-200">
                        <input type="radio" value="PAYABLE" checked={type === "PAYABLE"} onChange={(e) => setType(e.target.value as "PAYABLE" | "RECEIVABLE")} className="accent-[#F26076]" />
                        <span className="text-sm">Hutang</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-gray-900 dark:text-gray-200">
                        <input type="radio" value="RECEIVABLE" checked={type === "RECEIVABLE"} onChange={(e) => setType(e.target.value as "PAYABLE" | "RECEIVABLE")} className="accent-[#458B73]" />
                        <span className="text-sm">Piutang</span>
                    </label>
                </div>
            </div>

            {/* New/Old toggle — only for creation */}
            {!initialData && (
                <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    <label className="block text-sm font-medium text-white dark:text-gray-300 mb-2">
                        {type === "PAYABLE" ? "Jenis Hutang" : "Jenis Piutang"}
                    </label>
                    <div className="flex gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer dark:text-gray-200">
                            <input type="radio" checked={isNew} onChange={() => setIsNew(true)} className="accent-[#458B73]" />
                            <span className="text-sm">Baru</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer dark:text-gray-200">
                            <input type="radio" checked={!isNew} onChange={() => setIsNew(false)} className="accent-[#458B73]" />
                            <span className="text-sm">Lama</span>
                        </label>
                    </div>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2 leading-relaxed">
                        {isNew
                            ? type === "PAYABLE"
                                ? "💡 Hutang baru: saldo Anda akan bertambah karena Anda menerima uang pinjaman."
                                : "💡 Piutang baru: saldo Anda akan berkurang karena Anda meminjamkan uang."
                            : type === "PAYABLE"
                                ? "💡 Hutang lama: hanya dicatat, tidak memengaruhi saldo saat ini."
                                : "💡 Piutang lama: hanya dicatat, tidak memengaruhi saldo saat ini."
                        }
                    </p>
                </div>
            )}

            {/* Name */}
            <div>
                <label className="block text-sm font-medium text-white dark:text-gray-300">{type === "RECEIVABLE" ? "Nama Piutang" : "Nama Hutang"}</label>
                <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#458B73] bg-white dark:bg-gray-700 dark:text-white"
                    placeholder={type === "RECEIVABLE" ? "Contoh: Pinjaman ke Budi" : "Contoh: Cicilan Motor"}
                />
            </div>

            {/* Amount */}
            <div>
                <label className="block text-sm font-medium text-white dark:text-gray-300">Jumlah Total</label>
                <input
                    type="number"
                    required
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 block w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#458B73] bg-white dark:bg-gray-700 dark:text-white"
                />
            </div>

            {/* Due Date */}
            <div>
                <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-white dark:text-gray-300">Jatuh Tempo</label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={hasDueDate} onChange={(e) => setHasDueDate(e.target.checked)} className="accent-[#458B73]" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">Ada tenggat</span>
                    </label>
                </div>
                {hasDueDate ? (
                    <input
                        type="date"
                        value={dueDate}
                        min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="mt-1 block w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#458B73] bg-white dark:bg-gray-700 dark:text-white"
                        style={{ colorScheme: "light dark" }}
                    />
                ) : (
                    <p className="text-xs text-gray-400 dark:text-gray-500 italic mt-1">Tanpa tenggat waktu</p>
                )}
            </div>

            {/* Status (edit only) */}
            {initialData && (
                <div>
                    <label className="block text-sm font-medium text-white dark:text-gray-300">Status</label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="mt-1 block w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#458B73] bg-white dark:bg-gray-700 dark:text-white"
                    >
                        <option value="ONGOING">Belum Lunas</option>
                        <option value="PAID">Lunas</option>
                    </select>
                </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl cursor-pointer transition-colors"
                >
                    Batal
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer disabled:opacity-50"
                    style={{ background: "#458B73" }}
                >
                    {loading ? "Menyimpan..." : "Simpan"}
                </button>
            </div>
        </form>
    );
}
