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
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* Type selector */}
            <div>
                <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wide">Tipe</label>
                <div className="grid grid-cols-2 gap-3">
                    <label className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${type === "PAYABLE" ? "bg-[#F26076]/20 border-[#F26076] text-[#F26076]" : "bg-black/20 border-white/5 text-neutral-400 hover:bg-white/5"}`}>
                        <input type="radio" value="PAYABLE" checked={type === "PAYABLE"} onChange={(e) => setType(e.target.value as "PAYABLE" | "RECEIVABLE")} className="hidden" />
                        <span className="text-sm font-bold">Hutang</span>
                    </label>
                    <label className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${type === "RECEIVABLE" ? "bg-[#458B73]/20 border-[#458B73] text-[#458B73]" : "bg-black/20 border-white/5 text-neutral-400 hover:bg-white/5"}`}>
                        <input type="radio" value="RECEIVABLE" checked={type === "RECEIVABLE"} onChange={(e) => setType(e.target.value as "PAYABLE" | "RECEIVABLE")} className="hidden" />
                        <span className="text-sm font-bold">Piutang</span>
                    </label>
                </div>
            </div>

            {/* New/Old toggle — only for creation */}
            {!initialData && (
                <div className="p-4 rounded-xl border border-white/10 bg-black/20">
                    <label className="block text-xs font-bold text-neutral-400 mb-3 uppercase tracking-wide">
                        {type === "PAYABLE" ? "Jenis Hutang" : "Jenis Piutang"}
                    </label>
                    <div className="flex gap-4 mb-3">
                        <label className="flex items-center gap-2 cursor-pointer text-white">
                            <input type="radio" checked={isNew} onChange={() => setIsNew(true)} className="accent-[#458B73] w-4 h-4" />
                            <span className="text-sm font-medium">Baru (Catat Saldo)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-white">
                            <input type="radio" checked={!isNew} onChange={() => setIsNew(false)} className="accent-[#458B73] w-4 h-4" />
                            <span className="text-sm font-medium">Lama (Hanya Status)</span>
                        </label>
                    </div>
                    <p className="text-xs text-neutral-500 leading-relaxed border-t border-white/5 pt-2">
                        {isNew
                            ? type === "PAYABLE"
                                ? "💡 Hutang baru: saldo Anda akan bertambah."
                                : "💡 Piutang baru: saldo Anda akan berkurang."
                            : type === "PAYABLE"
                                ? "💡 Hutang lama: hanya dicatat, tidak memengaruhi saldo."
                                : "💡 Piutang lama: hanya dicatat, tidak memengaruhi saldo."
                        }
                    </p>
                </div>
            )}

            {/* Name */}
            <div>
                <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wide">{type === "RECEIVABLE" ? "Nama Pemenjam" : "Nama Pemberi Pinjaman"}</label>
                <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-white/10 rounded-xl px-4 py-3 text-sm bg-black/20 text-white focus:outline-none focus:ring-1 focus:ring-[#458B73] placeholder-neutral-600"
                    placeholder={type === "RECEIVABLE" ? "Contoh: Budi" : "Contoh: Bank BCA"}
                />
            </div>

            {/* Amount */}
            <div>
                <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wide">Jumlah Total</label>
                <div className="relative">
                    <span className="absolute left-4 top-3 text-neutral-500 text-sm">Rp</span>
                    <input
                        type="number"
                        required
                        min="1"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm bg-black/20 text-white focus:outline-none focus:ring-1 focus:ring-[#458B73] placeholder-neutral-600"
                    />
                </div>
            </div>

            {/* Due Date */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide">Jatuh Tempo</label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={hasDueDate} onChange={(e) => setHasDueDate(e.target.checked)} className="accent-[#458B73] w-4 h-4" />
                        <span className="text-xs text-neutral-400">Ada tenggat</span>
                    </label>
                </div>
                {hasDueDate ? (
                    <input
                        type="date"
                        value={dueDate}
                        min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full border border-white/10 rounded-xl px-4 py-3 text-sm bg-black/20 text-white focus:outline-none focus:ring-1 focus:ring-[#458B73]"
                        style={{ colorScheme: "dark" }}
                    />
                ) : (
                    <div className="w-full border border-dashed border-white/10 rounded-xl px-4 py-3 text-sm bg-black/10 text-neutral-500 italic text-center">
                        Tanpa tenggat waktu
                    </div>
                )}
            </div>

            {/* Status (edit only) */}
            {initialData && (
                <div>
                    <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wide">Status</label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full border border-white/10 rounded-xl px-4 py-3 text-sm bg-black/20 text-white focus:outline-none focus:ring-1 focus:ring-[#458B73] appearance-none"
                    >
                        <option value="ONGOING" className="bg-[#252525]">Belum Lunas</option>
                        <option value="PAID" className="bg-[#252525]">Lunas</option>
                    </select>
                </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2.5 text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors text-sm font-medium"
                >
                    Batal
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-2.5 bg-[#458B73] text-white rounded-xl hover:bg-[#3aa381] disabled:opacity-50 transition-all shadow-lg hover:shadow-[#458B73]/20 text-sm font-bold"
                >
                    {loading ? "Menyimpan..." : "Simpan"}
                </button>
            </div>
        </form>
    );
}
