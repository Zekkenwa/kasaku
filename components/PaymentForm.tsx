"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
    loanId: string;
    loanName: string;
    remaining: number;
    loanType: "PAYABLE" | "RECEIVABLE";
    onClose: () => void;
};

export default function PaymentForm({ loanId, loanName, remaining, loanType, onClose }: Props) {
    const router = useRouter();
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState(false);

    const isPayable = loanType === "PAYABLE";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch(`/api/loans/${loanId}/payments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount: Number(amount),
                    date,
                    note,
                    loanType,
                }),
            });

            if (!res.ok) throw new Error("Gagal menyimpan pembayaran");

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
            <div className="p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#1a1a1a] mb-4 text-sm">
                <p className="text-gray-500 dark:text-gray-400">{isPayable ? "Membayar hutang:" : "Menerima piutang:"}</p>
                <p className="font-semibold text-gray-900 dark:text-white">{loanName}</p>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Sisa {isPayable ? "Tagihan" : "Piutang"}:</p>
                <p className="font-semibold" style={{ color: isPayable ? "#F26076" : "#458B73" }}>
                    Rp {remaining.toLocaleString("id-ID")}
                </p>
            </div>

            <div className="p-2.5 rounded-lg text-[11px] leading-relaxed" style={{ background: isPayable ? "rgba(242,96,118,0.08)" : "rgba(69,139,115,0.08)", color: isPayable ? "#c2405a" : "#357a60" }}>
                {isPayable
                    ? "💡 Pembayaran ini akan tercatat sebagai pengeluaran di Riwayat Cashflow."
                    : "💡 Pembayaran ini akan tercatat sebagai pemasukan di Riwayat Cashflow."
                }
            </div>

            <div>
                <label className="block text-sm font-medium text-white dark:text-gray-300">Jumlah Bayar</label>
                <input
                    type="number"
                    required
                    min="1"
                    max={remaining}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 block w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#458B73] bg-white dark:bg-[#1a1a1a] dark:text-white"
                    placeholder="Rp 0"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-white dark:text-gray-300">Tanggal</label>
                <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1 block w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#458B73] bg-white dark:bg-[#1a1a1a] dark:text-white"
                    style={{ colorScheme: "light dark" }}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-white dark:text-gray-300">Catatan (Opsional)</label>
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="mt-1 block w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#458B73] bg-white dark:bg-[#1a1a1a] dark:text-white"
                    rows={2}
                />
            </div>

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
                    style={{ background: isPayable ? "#F26076" : "#458B73" }}
                >
                    {loading ? "Menyimpan..." : isPayable ? "Bayar" : "Terima"}
                </button>
            </div>
        </form>
    );
}
