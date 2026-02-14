"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOtpCountdown } from "@/lib/hooks";

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [step, setStep] = useState<"phone" | "reset">("phone");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // UI State
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Timer Hook
    const { seconds, isActive, startCountdown, resetCountdown, formatTime } = useOtpCountdown();

    const handleRequestOtp = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError(null);

        // Basic Validation
        const cleanPhone = phone.replace(/\D/g, "");
        if (!cleanPhone.startsWith("62") || cleanPhone.length < 10) {
            setError("Nomor WhatsApp harus berawalan 62 dan minimal 10 digit");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/auth/forgot-password/request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: cleanPhone })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Gagal mengirim OTP");
            } else {
                setStep("reset");
                startCountdown(); // Start timer
            }
        } catch (err) {
            setError("Terjadi kesalahan jaringan");
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (isActive) return;
        await handleRequestOtp();
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (password !== confirmPassword) {
            setError("Password tidak cocok");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/auth/forgot-password/reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    phone: phone.replace(/\D/g, ""),
                    otp,
                    password
                })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Gagal mereset password");
            } else {
                setSuccess("Password berhasil direset! Mengalihkan ke login...");
                setTimeout(() => {
                    router.push("/login");
                }, 2000);
            }

        } catch (err) {
            setError("Terjadi kesalahan saat mereset password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#1E1E1E]">
            {/* Background Decoration (Stitch Style) */}
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-brand-green/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-brand-red/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in-up">
                <div className="bg-[#252525]/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 md:p-10 border border-white/5 relative overflow-hidden">
                    {/* Top Glow inside card */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-brand-green/50 to-transparent opacity-50" />

                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-inner">
                            <span className="text-4xl">🔐</span>
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Lupa Password?</h1>
                        <p className="text-neutral-400 text-sm">
                            {step === "phone" ? "Jangan panik. Masukkan nomor WhatsAppmu untuk reset." : "Buat password baru yang kuat."}
                        </p>
                    </div>

                    {step === "phone" ? (
                        <form onSubmit={handleRequestOtp} className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Nomor WhatsApp</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-3.5 text-neutral-500">📱</span>
                                    <input
                                        required
                                        type="text"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value.replace(/\D/g, ""))}
                                        className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#1a1a1a] border border-white/5 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green/50 transition-all"
                                        placeholder="62812..."
                                    />
                                </div>
                            </div>

                            {error && <div className="text-xs text-brand-red bg-brand-red/10 p-3 rounded-lg border border-brand-red/20 text-center">⚠️ {error}</div>}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 rounded-xl text-white font-bold text-base shadow-lg shadow-brand-green/20 hover:shadow-brand-green/40 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-gradient-to-r from-brand-green to-teal-500"
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
                                    "Kirim OTP Reset →"
                                )}
                            </button>

                            <div className="text-center mt-6">
                                <Link href="/login" className="text-xs font-bold text-neutral-500 hover:text-white transition-colors uppercase tracking-widest">
                                    ← Kembali ke Login
                                </Link>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleResetPassword} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4 text-center">Kode OTP</label>
                                <input
                                    required
                                    autoFocus
                                    type="text"
                                    maxLength={6}
                                    value={otp}
                                    onChange={e => setOtp(e.target.value)}
                                    className="w-full text-center text-2xl font-bold tracking-[0.5em] py-4 border border-white/10 rounded-xl bg-[#1a1a1a] text-white focus:border-brand-green/50 focus:ring-2 focus:ring-brand-green/20 focus:outline-none transition-all placeholder-neutral-700"
                                    placeholder="XXXXXX"
                                />
                                <div className="flex justify-between items-center mt-3 px-1">
                                    <p className="text-[10px] text-neutral-500">Dikirim ke <span className="text-white">{phone}</span></p>
                                    <button
                                        type="button"
                                        onClick={handleResendOtp}
                                        disabled={isActive || loading}
                                        className="text-[10px] text-brand-green font-bold hover:underline disabled:text-neutral-600 disabled:no-underline"
                                    >
                                        {isActive ? `Kirim Ulang (${formatTime(seconds)})` : "Kirim Ulang"}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Password Baru</label>
                                    <div className="relative">
                                        <input
                                            required
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-[#1a1a1a] border border-white/5 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green/50 transition-all"
                                            placeholder="••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-3 text-neutral-500 hover:text-white focus:outline-none"
                                        >
                                            {showPassword ? "🙈" : "👁️"}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Konfirmasi</label>
                                    <input
                                        required
                                        type="password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        className={`w-full px-4 py-3 rounded-xl bg-[#1a1a1a] border text-white placeholder-neutral-600 focus:outline-none focus:ring-2 transition-all ${password && confirmPassword && password !== confirmPassword ? "border-red-500 focus:ring-red-500/50" : "border-white/5 focus:ring-brand-green/50"}`}
                                        placeholder="••••••"
                                    />
                                </div>
                            </div>
                            {password && confirmPassword && password !== confirmPassword && (
                                <p className="text-xs text-brand-red mt-0 animate-pulse text-center">⚠️ Password tidak cocok</p>
                            )}


                            {error && <div className="text-xs text-brand-red bg-brand-red/10 p-3 rounded-lg border border-brand-red/20 text-center">⚠️ {error}</div>}
                            {success && <div className="text-xs text-brand-green bg-brand-green/10 p-3 rounded-lg border border-brand-green/20 text-center">✅ {success}</div>}

                            <button
                                type="submit"
                                disabled={loading || !!success}
                                className="w-full py-3.5 rounded-xl text-white font-bold text-base shadow-lg shadow-brand-green/20 hover:shadow-brand-green/40 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 bg-gradient-to-r from-brand-green to-teal-500"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Menyimpan...</span>
                                    </>
                                ) : (
                                    "Reset Password"
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setStep("phone")}
                                className="w-full text-xs text-neutral-500 hover:text-white transition-colors"
                            >
                                ← Ganti Nomor
                            </button>

                            <div className="text-center mt-4 border-t border-white/5 pt-4">
                                <button
                                    type="button"
                                    onClick={() => alert("Silakan hubungi developer di email: chalsinglalim@gmail.com dengan subjek 'Bantuan Login Kasaku' dan sertakan bukti kepemilikan akun.")}
                                    className="text-[10px] text-brand-red hover:text-brand-orange hover:underline transition-colors"
                                >
                                    Tidak bisa akses nomor telepon?
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </main>
    );
}
