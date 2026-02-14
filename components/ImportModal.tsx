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
        const header = "No,Tanggal,Kategori,Pemasukan,Pengeluaran,Catatan\n";
        const example =
            "1,02/02/2026,Jajan,0,3000000,gadogado\n" +
            "2,03/02/2026,Gaji,12000000,0,gaji bersih\n" +
            "3,04/02/2026,Bayar hutang,,200000,kpr rumah";
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

        const header = "No,Tanggal,Kategori,Pemasukan,Pengeluaran,Catatan\n";

        // Sort by date ascending
        const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let totalPemasukan = 0;
        let totalPengeluaran = 0;

        const rows = sorted.map((t, i) => {
            const date = new Date(t.date);
            const dd = String(date.getDate()).padStart(2, "0");
            const mm = String(date.getMonth() + 1).padStart(2, "0");
            const yyyy = date.getFullYear();
            const tanggal = `${dd}/${mm}/${yyyy}`;

            const pemasukan = t.type === "INCOME" ? t.amount : 0;
            const pengeluaran = t.type === "EXPENSE" ? t.amount : 0;

            totalPemasukan += pemasukan;
            totalPengeluaran += pengeluaran;

            const note = (t.note || "").replace(/,/g, " ").replace(/\n/g, " ");

            return `${i + 1},${tanggal},${t.category},${pemasukan},${pengeluaran},${note}`;
        });

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="relative bg-[#252525] rounded-3xl border border-white/5 w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                    <h2 className="text-xl font-bold text-white tracking-tight">
                        {title}
                    </h2>
                    <button
                        onClick={reset}
                        className="text-neutral-500 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5"
                    >
                        ✕
                    </button>
                </div>

                {!result ? (
                    <div className="space-y-6">
                        {/* Export Section */}
                        <div className="p-4 rounded-xl border border-white/5 bg-black/20">
                            <p className="text-sm font-bold text-white mb-1">📤 Ekspor Transaksi</p>
                            <p className="text-xs text-neutral-400 mb-3">Download semua transaksi Anda ke file CSV.</p>
                            <button
                                type="button"
                                onClick={handleExport}
                                className="w-full px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg hover:shadow-[#458B73]/20 hover:scale-[1.02] transition-all"
                                style={{ background: "#458B73" }}
                            >
                                📥 Download CSV
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-px bg-white/5" />
                            <span className="text-xs text-neutral-500 font-medium">atau</span>
                            <div className="flex-1 h-px bg-white/5" />
                        </div>

                        {/* Import Section */}
                        <form onSubmit={handleUpload} className="space-y-4">
                            <div>
                                <div className="flex justify-between items-baseline mb-1">
                                    <p className="text-sm font-bold text-white">📥 Import Transaksi</p>
                                    <button
                                        type="button"
                                        onClick={handleDownloadTemplate}
                                        className="text-xs text-[#458B73] hover:text-[#3aa381] hover:underline font-medium flex items-center gap-1"
                                    >
                                        📄 Download Template
                                    </button>
                                </div>
                                <p className="text-[10px] text-neutral-500 font-mono">
                                    Format: No, Tanggal, Kategori, Masuk, Keluar...
                                </p>
                            </div>

                            <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:bg-black/20 hover:border-white/20 transition-all cursor-pointer relative group">
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="flex flex-col items-center gap-2 text-neutral-400 group-hover:text-white transition-colors">
                                    <span className="text-2xl">📄</span>
                                    <p className="font-medium text-sm">
                                        {file ? file.name : "Klik untuk pilih file CSV"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={reset}
                                    className="px-4 py-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors font-medium text-sm"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={!file || loading}
                                    className="px-6 py-2 bg-[#458B73] text-white rounded-lg hover:bg-[#3aa381] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-bold shadow-lg"
                                >
                                    {loading ? "Mengupload..." : "Upload"}
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="text-center space-y-4 py-4">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#458B73]/20 text-[#458B73] mb-2 animate-bounce-in">
                            <span className="text-3xl">✅</span>
                        </div>
                        <h3 className="text-lg font-bold text-white">Import Selesai!</h3>
                        <div className="bg-black/20 p-4 rounded-xl border border-white/5 text-sm">
                            <div className="flex justify-between mb-2">
                                <span className="text-neutral-400">Berhasil:</span>
                                <span className="font-bold text-[#458B73]">{result.success}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-neutral-400">Gagal:</span>
                                <span className="font-bold text-[#F26076]">{result.errors}</span>
                            </div>
                        </div>
                        <button
                            onClick={reset}
                            className="w-full py-2.5 bg-[#458B73] text-white rounded-xl hover:bg-[#3aa381] transition-all font-bold mt-4 shadow-lg shadow-[#458B73]/20"
                        >
                            Tutup
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
