"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Transaction = {
    id: string;
    type: string;
    amount: number;
    category: string;
    note?: string;
    date: string;
};

type Props = {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    transactions?: Transaction[];
    totalBalance?: number;
};

export default function ImportModal({ isOpen, onClose, title, transactions, totalBalance }: Props) {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success: number; errors: number } | null>(null);

    if (!isOpen) return null;

    const handleDownloadTemplate = () => {
        const header = "No,Tanggal,Kategori,Pemasukan,Pengeluaran,Saldo,Catatan\n";
        const example =
            "1,02/02/2026,Jajan,0,3000000,80000000,gadogado\n" +
            "2,03/02/2026,Gaji,12000000,0,92000000,gaji bersih\n" +
            "3,04/02/2026,Bayar hutang,,200000,91800000,kpr rumah\n" +
            "Total,,,12000000,3200000,,";
        const blob = new Blob([header + example], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "template-transaksi-kasaku.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleExport = () => {
        if (!transactions || transactions.length === 0) {
            alert("Belum ada transaksi untuk diekspor.");
            return;
        }

        const header = "No,Tanggal,Kategori,Pemasukan,Pengeluaran,Saldo,Catatan\n";

        // Sort by date ascending
        const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let runningBalance = (totalBalance || 0);
        // Calculate starting balance by working backwards
        const totalIncome = sorted.filter(t => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
        const totalExpense = sorted.filter(t => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
        let startBalance = runningBalance - totalIncome + totalExpense;

        let totalPemasukan = 0;
        let totalPengeluaran = 0;
        let totalSaldoSum = 0; // The template sums the running balance column too

        const rows = sorted.map((t, i) => {
            const date = new Date(t.date);
            const dd = String(date.getDate()).padStart(2, "0");
            const mm = String(date.getMonth() + 1).padStart(2, "0");
            const yyyy = date.getFullYear();
            const tanggal = `${dd}/${mm}/${yyyy}`;

            const pemasukan = t.type === "INCOME" ? t.amount : 0;
            const pengeluaran = t.type === "EXPENSE" ? t.amount : 0;
            startBalance = startBalance + pemasukan - pengeluaran;

            totalPemasukan += pemasukan;
            totalPengeluaran += pengeluaran;
            totalSaldoSum += startBalance;

            const note = (t.note || "").replace(/,/g, " ").replace(/\n/g, " ");

            return `${i + 1},${tanggal},${t.category},${pemasukan},${pengeluaran},${startBalance},${note}`;
        });

        // Add total row
        rows.push(`Total,,,${totalPemasukan},${totalPengeluaran},${totalSaldoSum},`);

        const csv = header + rows.join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const now = new Date();
        a.download = `kasaku-transaksi-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setLoading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/transactions/import", {
                method: "POST",
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                setResult({ success: data.count, errors: data.errors });
                router.refresh();
            } else {
                alert("Gagal mengupload file");
            }
        } catch (error) {
            alert("Terjadi kesalahan");
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setFile(null);
        setResult(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 card-fix rounded-2xl w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in duration-200 transition-colors">
                <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                        {title}
                    </h2>
                    <button
                        onClick={reset}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                    >
                        ✕
                    </button>
                </div>

                {!result ? (
                    <div className="space-y-6">
                        {/* Export Section */}
                        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">📤 Ekspor Transaksi</p>
                            <p className="text-xs text-gray-400 dark:text-gray-400 mb-3">Download semua transaksi Anda ke file CSV.</p>
                            <button
                                type="button"
                                onClick={handleExport}
                                className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer hover:opacity-90 transition-opacity"
                                style={{ background: "#458B73" }}
                            >
                                📥 Download CSV
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                            <span className="text-xs text-gray-400 font-medium">atau</span>
                            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                        </div>

                        {/* Import Section */}
                        <form onSubmit={handleUpload} className="space-y-4">
                            <div>
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">📥 Import Transaksi</p>
                                <p className="text-xs text-gray-400 mb-2">
                                    Format: No, Tanggal (DD/MM/YYYY), Kategori, Pemasukan, Pengeluaran, Saldo, Catatan
                                </p>
                                <button
                                    type="button"
                                    onClick={handleDownloadTemplate}
                                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-1 cursor-pointer"
                                    style={{ color: "#458B73" }} // Using brand color in dark mode context via style might be better or specific class
                                >
                                    📄 Download Template CSV
                                </button>
                            </div>

                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer relative">
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <p className="text-white dark:text-gray-300 font-medium">
                                    {file ? file.name : "Klik untuk pilih file CSV"}
                                </p>
                                <p className="text-xs text-white mt-1">Maksimal 5MB</p>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={reset}
                                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium text-sm cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={!file || loading}
                                    className="px-6 py-2 bg-black dark:bg-[#458B73] text-white rounded-lg hover:bg-gray-800 dark:hover:bg-[#3aa381] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-gray-200 dark:shadow-none text-sm font-medium cursor-pointer"
                                >
                                    {loading ? "Mengupload..." : "Upload"}
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="text-center space-y-4 py-4">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-2">
                            <span className="text-3xl">✅</span>
                        </div>
                        <h3 className="text-lg font-semibold text-white dark:text-white">Import Selesai!</h3>
                        <p className="text-gray-600 dark:text-gray-300">
                            Berhasil: <span className="font-bold text-green-600 dark:text-green-400">{result.success}</span> transaksi
                            <br />
                            Gagal: <span className="font-bold text-red-600 dark:text-red-400">{result.errors}</span> baris
                        </p>
                        <button
                            onClick={reset}
                            className="w-full py-2.5 bg-black dark:bg-[#458B73] text-white rounded-lg hover:bg-gray-800 dark:hover:bg-[#3aa381] transition-colors font-medium mt-4 cursor-pointer"
                        >
                            Tutup
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
