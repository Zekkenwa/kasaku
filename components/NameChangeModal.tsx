"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    currentName: string;
    lastChangeAt?: string | null;
};

export default function NameChangeModal({ isOpen, onClose, currentName, lastChangeAt }: Props) {
    const router = useRouter();
    const [name, setName] = useState(currentName);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    if (!isOpen) return null;

    // Hitung sisa waktu cooldown (7 hari)
    let canChange = true;
    let daysRemaining = 0;

    if (lastChangeAt) {
        const lastChangeDate = new Date(lastChangeAt);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - lastChangeDate.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 7) {
            canChange = false;
            daysRemaining = 7 - diffDays;
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            setError("Nama tidak boleh kosong");
            return;
        }

        if (name === currentName) {
            onClose();
            return;
        }

        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/account/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });
            const data = await res.json();

            if (res.ok) {
                setSuccess("Nama berhasil diperbarui!");
                setTimeout(() => {
                    onClose();
                    router.refresh();
                }, 1500);
            } else {
                setError(data.error || "Gagal mengubah nama");
            }
        } catch (err: any) {
            setError("Terjadi kesalahan jaringan");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative bg-[#252525] rounded-3xl border border-white/5 w-full max-w-md p-6 shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
                >
                    ✕
                </button>

                <h2 className="text-xl font-bold text-white mb-2">Ubah Nama</h2>
                <p className="text-sm text-neutral-400 mb-6 font-medium leading-relaxed">
                    Nama digunakan untuk personalisasi sapaan di Dashboard. Anda hanya dapat mengubah nama sekali dalam 7 hari.
                </p>

                {error && (
                    <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-semibold whitespace-pre-line">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="p-3 mb-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-500 text-xs font-semibold">
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] text-neutral-500 uppercase font-black ml-1">Nama Panggilan</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={!canChange || loading}
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-4 text-white font-bold text-lg focus:border-[#458B73] outline-none disabled:opacity-50"
                            placeholder="Nama Anda"
                            required
                            autoComplete="off"
                        />
                        {!canChange && (
                            <p className="text-[10px] text-orange-400 italic px-1 animate-pulse">
                                ⏳ Anda baru saja mengubah nama. Tunggu {daysRemaining} hari lagi untuk mengubahnya kembali.
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !canChange || !name.trim() || name === currentName}
                        className="w-full py-3.5 bg-[#458B73] hover:bg-[#3aa381] text-white font-bold rounded-xl transition-all shadow-lg shadow-[#458B73]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Menyimpan..." : "Simpan Nama"}
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-3 bg-transparent hover:bg-white/5 text-neutral-400 hover:text-white font-bold rounded-xl transition-all border border-transparent hover:border-white/10"
                    >
                        Batal
                    </button>
                </form>
            </div>
        </div>
    );
}
