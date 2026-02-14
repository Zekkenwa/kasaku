"use client";

import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    currentEmail: string;
    phone: string | null;
};

export default function EmailChangeModal({ isOpen, onClose, currentEmail, phone }: Props) {
    const [step, setStep] = useState<"REQUEST" | "VERIFY">("REQUEST");
    const [otp, setOtp] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [inputPhone, setInputPhone] = useState("");
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

    const requestOtp = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/account/email/change", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "request_otp", phone: inputPhone }),
            });
            const data = await res.json();
            if (res.ok) {
                setStep("VERIFY");
                setCountdown(60); // Countdown starts ONLY on success
                alert("OTP telah dikirim ke WhatsApp Anda.");
            } else {
                setError(data.error || "Gagal mengirim OTP");
            }
        } catch (err) {
            setError("Terjadi kesalahan jaringan");
        } finally {
            setLoading(false);
        }
    };

    const submitEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/account/email/change", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "confirm_change",
                    otp,
                    newEmail,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setSuccess("Email berhasil diubah! Silakan login ulang dengan email baru.");
                setTimeout(async () => {
                    onClose();
                    await signOut({ callbackUrl: "/login" });
                }, 2000);
            } else {
                setError(data.error || "Gagal mengubah email");
            }
        } catch (err) {
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

                <h2 className="text-xl font-bold text-white mb-2">Ubah Email</h2>
                <p className="text-sm text-neutral-400 mb-6">
                    {step === "REQUEST"
                        ? "Kode OTP akan dikirim ke WhatsApp untuk verifikasi."
                        : "Masukkan OTP dan email baru Anda."}
                </p>

                {error && (
                    <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-medium">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="p-3 mb-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-500 text-sm font-medium">
                        {success}
                    </div>
                )}

                {step === "REQUEST" ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-neutral-500 uppercase mb-2 ml-1">Konfirmasi Nomor WhatsApp</label>
                            <input
                                type="tel"
                                value={inputPhone}
                                onChange={(e) => setInputPhone(e.target.value.replace(/\D/g, ""))}
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-[#458B73] transition-colors"
                                placeholder="628123456789"
                                required
                            />
                            <p className="text-[10px] text-neutral-500 mt-2 ml-1">Masukkan nomor WhatsApp Anda untuk menerima OTP.</p>
                        </div>
                        <button
                            onClick={requestOtp}
                            disabled={loading || !inputPhone}
                            className="w-full py-3.5 bg-[#458B73] hover:bg-[#3aa381] text-white font-bold rounded-xl transition-all shadow-lg shadow-[#458B73]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Mengirim OTP..." : "Kirim Kode OTP"}
                        </button>
                    </div>
                ) : (
                    <form onSubmit={submitEmail} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Email Baru</label>
                            <input
                                type="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#458B73]"
                                placeholder="nama@email.com"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Kode OTP</label>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-center tracking-widest text-lg"
                                placeholder="000000"
                                maxLength={6}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-[#458B73] hover:bg-[#3aa381] text-white font-bold rounded-xl transition-all"
                        >
                            {loading ? "Memproses..." : "Simpan Email Baru"}
                        </button>
                        <div className="text-center">
                            {countdown > 0 ? (
                                <p className="text-xs text-neutral-500">Kirim ulang dalam {countdown}s</p>
                            ) : (
                                <button type="button" onClick={requestOtp} className="text-xs text-[#458B73] hover:underline">
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
