"use client";

import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    email: string;
    phone: string | null;
};

export default function ChangePasswordModal({ isOpen, onClose, email, phone }: Props) {
    const [step, setStep] = useState<"REQUEST" | "VERIFY">("REQUEST");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
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
            const res = await fetch("/api/account/password/change", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "request_otp" }),
            });
            const data = await res.json();
            if (res.ok) {
                setStep("VERIFY");
                setCountdown(60);
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

    const submitPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/account/password/change", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "change_password",
                    otp,
                    newPassword,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setSuccess("Password berhasil diubah! Silakan login ulang.");
                setTimeout(async () => {
                    onClose();
                    await signOut({ callbackUrl: "/login" });
                }, 2000);
            } else {
                setError(data.error || "Gagal mengubah password");
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

                <h2 className="text-xl font-bold text-white mb-2">Ubah Password</h2>
                <p className="text-sm text-neutral-400 mb-6">
                    {step === "REQUEST"
                        ? "Kami akan mengirimkan kode OTP ke WhatsApp Anda untuk verifikasi."
                        : "Masukkan kode OTP dan password baru Anda."}
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
                        <div className="p-4 bg-black/20 rounded-xl border border-white/5">
                            <p className="text-xs text-neutral-500 uppercase font-bold mb-1">Nomor WhatsApp</p>
                            <p className="text-white font-mono">{phone || "Belum terdaftar"}</p>
                        </div>
                        <button
                            onClick={requestOtp}
                            disabled={loading || !phone}
                            className="w-full py-3 bg-[#458B73] hover:bg-[#3aa381] text-white font-bold rounded-xl transition-all shadow-lg shadow-[#458B73]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Mengirim OTP...</span>
                                </>
                            ) : (
                                "Kirim Kode OTP"
                            )}
                        </button>
                    </div>
                ) : (
                    <form onSubmit={submitPassword} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Kode OTP</label>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-[#458B73] transition-colors font-mono text-center tracking-widest text-lg"
                                placeholder="000000"
                                maxLength={6}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Password Baru</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-[#458B73] transition-colors"
                                placeholder="Minimal 6 karakter"
                                minLength={6}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-[#458B73] hover:bg-[#3aa381] text-white font-bold rounded-xl transition-all shadow-lg shadow-[#458B73]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Memproses...</span>
                                </>
                            ) : (
                                "Simpan Password Baru"
                            )}
                        </button>

                        <div className="text-center">
                            {countdown > 0 ? (
                                <p className="text-xs text-neutral-500">Kirim ulang dalam {countdown}s</p>
                            ) : (
                                <button
                                    type="button"
                                    onClick={requestOtp}
                                    className="text-xs text-[#458B73] hover:underline"
                                >
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
