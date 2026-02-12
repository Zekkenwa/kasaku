"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
    categories: { id: string; name: string; type: string }[];
    initialData?: { categoryId: string; limitAmount: number; id?: string; period?: string; startDate?: string; endDate?: string; dayOfWeek?: number; dayOfMonth?: number; monthOfYear?: number } | null;
    onClose: () => void;
};

const PERIOD_OPTIONS = [
    { value: "MONTHLY", label: "Setiap Bulan", desc: "Budget otomatis reset tiap bulan" },
    { value: "WEEKLY", label: "Setiap Minggu", desc: "Budget reset di hari tertentu tiap minggu" },
    { value: "DAILY", label: "Setiap Hari", desc: "Budget reset setiap hari" },
    { value: "YEARLY", label: "Setiap Tahun", desc: "Budget reset di tanggal tertentu tiap tahun" },
    { value: "ONCE", label: "Sekali (ada tenggat)", desc: "Berlaku dari awal sampai tenggat waktu" },
    { value: "MANUAL", label: "Manual (tanpa batas waktu)", desc: "Berlaku sampai dihapus manual" },
];

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export default function BudgetForm({ categories, initialData, onClose }: Props) {
    const router = useRouter();
    const [categoryId, setCategoryId] = useState(initialData?.categoryId || "");
    const [limitAmount, setLimitAmount] = useState(
        initialData?.limitAmount ? String(initialData.limitAmount) : ""
    );
    const [period, setPeriod] = useState(initialData?.period || "MONTHLY");
    const [startDate, setStartDate] = useState(initialData?.startDate || "");
    const [endDate, setEndDate] = useState(initialData?.endDate || "");
    const [dayOfWeek, setDayOfWeek] = useState(initialData?.dayOfWeek ?? 1);
    const [dayOfMonth, setDayOfMonth] = useState(initialData?.dayOfMonth ?? 1);
    const [monthOfYear, setMonthOfYear] = useState(initialData?.monthOfYear ?? 1);
    const [loading, setLoading] = useState(false);

    const expenseCategories = categories.filter((c) => c.type === "EXPENSE");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!categoryId || !limitAmount) return;

        setLoading(true);
        try {
            const payload: Record<string, unknown> = {
                categoryId,
                limitAmount: parseFloat(limitAmount),
                period,
            };

            if (period === "ONCE") {
                payload.startDate = startDate || new Date().toISOString().slice(0, 10);
                payload.endDate = endDate || null;
            }
            if (period === "WEEKLY") {
                payload.dayOfWeek = dayOfWeek;
            }
            if (period === "MONTHLY") {
                payload.dayOfMonth = dayOfMonth;
            }
            if (period === "YEARLY") {
                payload.dayOfMonth = dayOfMonth;
                payload.monthOfYear = monthOfYear;
            }

            const url = initialData?.id ? `/api/budgets/${initialData.id}` : "/api/budgets";
            const method = initialData?.id ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                router.refresh();
                onClose();
            } else {
                alert("Gagal menyimpan budget");
            }
        } catch {
            alert("Terjadi kesalahan");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium mb-1">Kategori</label>
                <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#458B73]"
                    required
                    disabled={!!initialData}
                >
                    <option value="">Pilih Kategori</option>
                    {expenseCategories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Limit Budget (Rp)</label>
                <input
                    type="number"
                    value={limitAmount}
                    onChange={(e) => setLimitAmount(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#458B73]"
                    required
                    min="0"
                    placeholder="500000"
                />
            </div>

            {/* Repeat Type */}
            <div>
                <label className="block text-sm font-medium mb-2">Jenis Pengulangan</label>
                <div className="grid grid-cols-2 gap-2">
                    {PERIOD_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => setPeriod(opt.value)}
                            className={`p-2.5 rounded-xl text-left border-2 cursor-pointer transition-all ${period === opt.value ? "border-[#458B73] bg-[#458B73]/5" : "border-gray-100 hover:border-gray-300"}`}
                        >
                            <p className="text-sm font-medium" style={{ color: period === opt.value ? "#458B73" : "#374151" }}>{opt.label}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{opt.desc}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Conditional fields */}
            {period === "ONCE" && (
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium mb-1 text-gray-600">Mulai</label>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#458B73]" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1 text-gray-600">Tenggat</label>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#458B73]" />
                    </div>
                </div>
            )}

            {period === "WEEKLY" && (
                <div>
                    <label className="block text-xs font-medium mb-1 text-gray-600">Reset di hari</label>
                    <select value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#458B73]">
                        {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                    </select>
                </div>
            )}

            {period === "MONTHLY" && (
                <div>
                    <label className="block text-xs font-medium mb-1 text-gray-600">Reset di tanggal</label>
                    <select value={dayOfMonth} onChange={(e) => setDayOfMonth(Number(e.target.value))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#458B73]">
                        {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                    </select>
                </div>
            )}

            {period === "YEARLY" && (
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium mb-1 text-gray-600">Bulan</label>
                        <select value={monthOfYear} onChange={(e) => setMonthOfYear(Number(e.target.value))}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#458B73]">
                            {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((m, i) => (
                                <option key={i + 1} value={i + 1}>{m}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1 text-gray-600">Tanggal</label>
                        <select value={dayOfMonth} onChange={(e) => setDayOfMonth(Number(e.target.value))}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#458B73]">
                            {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                        </select>
                    </div>
                </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onClose}
                    className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer">Batal</button>
                <button type="submit" disabled={loading}
                    className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer disabled:opacity-50"
                    style={{ background: "#458B73" }}>
                    {loading ? "Menyimpan..." : "Simpan"}
                </button>
            </div>
        </form>
    );
}
