"use client";

import { useState, useEffect } from "react";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    currentPhone: string | null;
    onSuccess?: () => void;
};

export default function PhoneChangeModal({ isOpen, onClose, currentPhone, onSuccess }: Props) {
    const handleClose = async () => {
        try {
            await fetch("/api/account/phone/change", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "reset_verification" }),
            });
        } catch (e) {
            console.error("Failed to reset verification", e);
        }
        onClose();
    };

    const [step, setStep] = useState<"OLD_REQUEST" | "OLD_VERIFY" | "NEW_REQUEST" | "NEW_VERIFY">("OLD_REQUEST");
    const [otp, setOtp] = useState("");
    const [newPhone, setNewPhone] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [countdown, setCountdown] = useState(0);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    if (!isOpen) return null;

    const apiCall = async (action: string, body: any = {}) => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/account/phone/change", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, ...body }),
            });
            const data = await res.json();
            if (res.ok) return data;
            throw new Error(data.error || "Terjadi kesalahan");
        } catch (err: any) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const handleRequestOldOtp = async () => {
        const data = await apiCall("request_old_otp");
        if (data) {
            setStep("OLD_VERIFY");
            setCountdown(60);
        }
    };

    const handleVerifyOldOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        const data = await apiCall("verify_old_otp", { otp });
        if (data) {
            setStep("NEW_REQUEST");
            setOtp("");
            setCountdown(0);
        }
    };

    const handleRequestNewOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        const data = await apiCall("request_new_otp", { newPhone });
        if (data) {
            setStep("NEW_VERIFY");
            setCountdown(60);
        }
    };

    const handleConfirmChange = async (e: React.FormEvent) => {
        e.preventDefault();
        const data = await apiCall("confirm_change", { otp });
        if (data) {
            setSuccess("Nomor telepon berhasil diperbarui!");
            setTimeout(() => {
                if (onSuccess) onSuccess();
                onClose();
                window.location.reload();
            }, 2000);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative bg-[#252525] rounded-3xl border border-white/5 w-full max-w-md p-6 shadow-2xl">
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
                >
                    ✕
                </button>

                <h2 className="text-xl font-bold text-white mb-2">Ubah Nomor WhatsApp</h2>

                {/* Stepper info */}
                <div className="flex gap-1 mb-6">
                    {["Lama", "Verif", "Baru", "Selesai"].map((label, i) => {
                        const steps = ["OLD_REQUEST", "OLD_VERIFY", "NEW_REQUEST", "NEW_VERIFY"];
                        const currentIdx = steps.indexOf(step);
                        const isActive = i <= currentIdx;
                        return (
                            <div key={label} className="flex-1 flex flex-col gap-1">
                                <div className={`h-1 rounded-full transition-colors ${isActive ? "bg-[#458B73]" : "bg-white/10"}`} />
                                <span className={`text-[10px] text-center uppercase font-bold ${isActive ? "text-[#458B73]" : "text-neutral-500"}`}>{label}</span>
                            </div>
                        );
                    })}
                </div>

                <p className="text-sm text-neutral-400 mb-6 font-medium leading-relaxed">
                    {step === "OLD_REQUEST" && "Langkah 1: Kirim kode OTP ke nomor WhatsApp lama Anda untuk memverifikasi identitas."}
                    {step === "OLD_VERIFY" && "Langkah 2: Masukkan kode OTP yang dikirim ke nomor lama Anda."}
                    {step === "NEW_REQUEST" && "Langkah 3: Masukkan nomor WhatsApp baru Anda."}
                    {step === "NEW_VERIFY" && `Langkah 4: Masukkan kode OTP yang dikirim ke nomor baru (${newPhone}).`}
                </p>

                {error && (
                    <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-semibold">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="p-3 mb-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-500 text-xs font-semibold">
                        {success}
                    </div>
                )}

                {step === "OLD_REQUEST" && (
                    <div className="space-y-4">
                        <div className="p-4 bg-black/20 rounded-xl border border-white/5">
                            <p className="text-[10px] text-neutral-500 uppercase font-black mb-1">Nomor Sekarang</p>
                            <p className="text-white font-mono text-lg">{currentPhone || "-"}</p>
                        </div>
                        <button
                            onClick={handleRequestOldOtp}
                            disabled={loading || !currentPhone}
                            className="w-full py-3.5 bg-[#458B73] hover:bg-[#3aa381] text-white font-bold rounded-xl transition-all shadow-lg shadow-[#458B73]/20 disabled:opacity-50"
                        >
                            {loading ? "Mengirim OTP..." : "Kirim OTP ke Nomor Lama"}
                        </button>
                    </div>
                )}

                {step === "OLD_VERIFY" && (
                    <form onSubmit={handleVerifyOldOtp} className="space-y-4">
                        <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-4 text-white font-mono text-center tracking-[0.5em] text-xl focus:border-[#458B73] outline-none"
                            placeholder="000000"
                            maxLength={6}
                            required
                        />
                        <button
                            type="submit"
                            disabled={loading || otp.length < 6}
                            className="w-full py-3.5 bg-[#458B73] hover:bg-[#3aa381] text-white font-bold rounded-xl transition-all disabled:opacity-50"
                        >
                            {loading ? "Memproses..." : "Verifikasi Nomor Lama"}
                        </button>
                        <div className="text-center">
                            {countdown > 0 ? (
                                <p className="text-[11px] text-neutral-500">Kirim ulang dalam {countdown} detik</p>
                            ) : (
                                <button type="button" onClick={handleRequestOldOtp} className="text-[11px] text-[#458B73] hover:underline font-bold">
                                    Kirim Ulang OTP
                                </button>
                            )}
                        </div>
                    </form>
                )}

                {step === "NEW_REQUEST" && (
                    <form onSubmit={handleRequestNewOtp} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] text-neutral-500 uppercase font-black ml-1">Nomor WhatsApp Baru</label>
                            <input
                                type="tel"
                                value={newPhone}
                                onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ""))}
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-4 text-white font-mono text-lg focus:border-[#458B73] outline-none"
                                placeholder="628123456789"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !newPhone}
                            className="w-full py-3.5 bg-[#458B73] hover:bg-[#3aa381] text-white font-bold rounded-xl transition-all disabled:opacity-50"
                        >
                            {loading ? "Mengirim OTP..." : "Kirim OTP ke Nomor Baru"}
                        </button>
                    </form>
                )}

                {step === "NEW_VERIFY" && (
                    <form onSubmit={handleConfirmChange} className="space-y-4">
                        <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-4 text-white font-mono text-center tracking-[0.5em] text-xl focus:border-[#458B73] outline-none"
                            placeholder="000000"
                            maxLength={6}
                            required
                        />
                        <button
                            type="submit"
                            disabled={loading || otp.length < 6}
                            className="w-full py-3.5 bg-[#458B73] hover:bg-[#3aa381] text-white font-bold rounded-xl transition-all disabled:opacity-50"
                        >
                            {loading ? "Memproses..." : "Simpan Nomor Baru"}
                        </button>
                        <div className="text-center">
                            {countdown > 0 ? (
                                <p className="text-[11px] text-neutral-500">Kirim ulang dalam {countdown} detik</p>
                            ) : (
                                <button type="button" onClick={handleRequestNewOtp} className="text-[11px] text-[#458B73] hover:underline font-bold">
                                    Kirim Ulang OTP
                                </button>
                            )}
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
