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
        <main className="min-h-screen flex items-center justify-center relative overflow-hidden transition-colors duration-500"
            style={{
                background: "var(--auth-gradient)",
            }}
        >
            <div className="absolute top-[-120px] left-[-120px] w-80 h-80 rounded-full opacity-30 blur-3xl" style={{ background: "var(--brand-yellow)" }} />
            <div className="absolute bottom-[-100px] right-[-100px] w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: "var(--brand-red)" }} />

            <div className="relative z-10 w-full max-w-md mx-4">
                <div className="backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 rounded-3xl shadow-2xl p-10 border border-white/50 dark:border-gray-700 transition-colors">

                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold text-white">Lupa Password?</h1>
                        <p className="text-gray-400 text-sm mt-1">
                            {step === "phone" ? "Masukkan nomor WhatsApp Anda" : "Verifikasi OTP & Buat Password Baru"}
                        </p>
                    </div>

                    {step === "phone" ? (
                        <form onSubmit={handleRequestOtp} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Nomor WhatsApp</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-gray-400 text-sm">📞</span>
                                    <input
                                        required
                                        type="text"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value.replace(/\D/g, ""))}
                                        className="w-full pl-9 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#458B73] focus:outline-none"
                                        placeholder="628123456789"
                                    />
                                </div>
                            </div>

                            {error && <p className="text-sm text-red-500 text-center bg-red-50 p-2 rounded-lg">{error}</p>}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 rounded-xl text-white font-bold shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                                style={{ background: "linear-gradient(135deg, #458B73 0%, #458B73 100%)" }}
                            >
                                {loading ? "Memproses..." : "Kirim OTP Reset"}
                            </button>

                            <div className="text-center mt-4">
                                <Link href="/login" className="text-sm font-medium text-gray-400 hover:text-black">
                                    ← Kembali ke Login
                                </Link>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Kode OTP</label>
                                <input
                                    required
                                    autoFocus
                                    type="text"
                                    maxLength={6}
                                    value={otp}
                                    onChange={e => setOtp(e.target.value)}
                                    className="w-full text-center text-xl font-bold tracking-[0.5em] py-3 border border-gray-200 rounded-xl focus:border-[#458B73] focus:outline-none"
                                    placeholder="XXXXXX"
                                />
                                <div className="flex justify-between items-center mt-1">
                                    <p className="text-xs text-gray-400">Dikirim ke {phone}</p>
                                    <button
                                        type="button"
                                        onClick={handleResendOtp}
                                        disabled={isActive || loading}
                                        className="text-xs text-[#458B73] hover:underline disabled:text-gray-400 disabled:no-underline"
                                    >
                                        {isActive ? `Kirim Ulang (${formatTime(seconds)})` : "Kirim Ulang OTP"}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Password Baru</label>
                                <div className="relative">
                                    <input
                                        required
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#458B73] focus:outline-none"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                                    >
                                        {showPassword ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                                <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                                                <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                                <path d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18zM22.676 12.553a11.249 11.249 0 01-2.631 4.31l-3.099-3.099a5.25 5.25 0 00-6.71-6.71L7.759 4.577a11.217 11.217 0 014.242-.827c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113z" />
                                                <path d="M15.75 12c0 .18-.013.357-.037.53l-4.244-4.243A3.75 3.75 0 0115.75 12zM12.53 15.713l-4.243-4.244a3.75 3.75 0 004.244 4.243z" />
                                                <path d="M6.75 12c0-.619.107-1.215.304-1.764l-3.1-3.1a11.25 11.25 0 00-2.63 4.31c-.12.362-.12.752 0 1.114 1.489 4.467 5.702 7.69 10.675 7.69 1.5 0 2.933-.294 4.242-.827l-2.477-2.477A5.25 5.25 0 016.75 12z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {error && <p className="text-sm text-red-500 text-center bg-red-50 p-2 rounded-lg">{error}</p>}
                            {success && <p className="text-sm text-green-600 text-center bg-green-50 p-2 rounded-lg">{success}</p>}

                            <button
                                type="submit"
                                disabled={loading || !!success}
                                className="w-full py-3 rounded-xl text-white font-bold shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                                style={{ background: "linear-gradient(135deg, #458B73 0%, #458B73 100%)" }}
                            >
                                {loading ? "Memproses..." : "Reset Password"}
                            </button>

                            <button
                                type="button"
                                onClick={() => setStep("phone")}
                                className="w-full text-sm text-gray-400 hover:text-black"
                            >
                                ← Ganti Nomor
                            </button>

                            <div className="text-center mt-4 space-y-2">
                                <Link href="/login" className="block text-sm font-medium text-gray-400 hover:text-black">
                                    ← Kembali ke Login
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => alert("Silakan hubungi developer di email: chalsinglalim@gmail.com dengan subjek 'Bantuan Login Kasaku' dan sertakan bukti kepemilikan akun.")}
                                    className="block w-full text-xs text-[#F26076] hover:underline"
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
