"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useOtpCountdown } from "@/lib/hooks";

export default function RegisterPage() {
    const { status } = useSession();
    const router = useRouter();

    const [step, setStep] = useState<"form" | "otp">("form");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form Data
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [phone, setPhone] = useState("");

    // UI State
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // OTP Data
    const [otp, setOtp] = useState("");

    // Timer
    const { seconds, isActive, startCountdown, resetCountdown, formatTime } = useOtpCountdown();

    useEffect(() => {
        if (status === "authenticated") {
            router.replace("/dashboard");
        }
    }, [status, router]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Validation
        if (password !== confirmPassword) {
            setError("Password tidak cocok (did not match)");
            setLoading(false);
            return;
        }

        // Basic Validation
        if (!phone.startsWith("62") || phone.length < 10) {
            setError("Nomor WhatsApp harus berawalan 62 dan minimal 10 digit");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password, phone })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Gagal mendaftar");
            } else {
                setStep("otp");
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
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/auth/register/resend", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Gagal mengirim ulang OTP");
            } else {
                startCountdown();
                alert("OTP dikirim ulang!");
            }
        } catch (e) {
            setError("Gagal mengirim ulang OTP");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Verify OTP
            const res = await fetch("/api/auth/register/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, otp })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "OTP Salah");
                setLoading(false);
                return;
            }

            // 2. Auto Login
            const loginRes = await signIn("credentials", {
                email,
                password,
                redirect: false
            });

            if (loginRes?.ok) {
                router.replace("/dashboard");
            } else {
                setError("Gagal login otomatis. Silakan login manual.");
                router.push("/login");
            }

        } catch (err) {
            setError("Terjadi kesalahan saat verifikasi");
            setLoading(false);
        }
    };

    const handlePhoneChange = async (val: string) => {
        const p = val.replace(/\D/g, "");
        setPhone(p);

        if (p.length > 9) {
            // Check duplicate (debounce ideally, but simple for now)
            const res = await fetch("/api/auth/check-phone", {
                method: "POST",
                body: JSON.stringify({ phone: p })
            });
            const data = await res.json();
            if (data.exists) {
                setError("Nomor ini sudah terdaftar!");
            } else {
                if (error === "Nomor ini sudah terdaftar!") setError(null);
            }
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
                        <h1 className="text-2xl font-bold text-white mb-2">Buat Akun Baru</h1>
                        <p className="text-neutral-400 text-sm">
                            {step === "form" ? "Mulai perjalanan finansialmu sekarang." : "Verifikasi Nomor WhatsApp Anda"}
                        </p>
                    </div>

                    {step === "form" ? (
                        <form onSubmit={handleRegister} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Nama Lengkap</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-3.5 text-neutral-500">👤</span>
                                    <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#1a1a1a] border border-white/5 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green/50 transition-all" placeholder="Nama Anda" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Email</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-3.5 text-neutral-500">📧</span>
                                    <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#1a1a1a] border border-white/5 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green/50 transition-all" placeholder="email@contoh.com" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Password</label>
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
                                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Ulangi</label>
                                    <div className="relative">
                                        <input
                                            required
                                            type={showConfirmPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            className={`w-full px-4 py-3 rounded-xl bg-[#1a1a1a] border text-white placeholder-neutral-600 focus:outline-none focus:ring-2 transition-all ${password && confirmPassword && password !== confirmPassword ? "border-red-500 focus:ring-red-500/50" : "border-white/5 focus:ring-brand-green/50"}`}
                                            placeholder="••••••"
                                        />
                                    </div>
                                </div>
                            </div>
                            {password && confirmPassword && password !== confirmPassword && (
                                <p className="text-xs text-brand-red mt-1 animate-pulse">⚠️ Password tidak cocok</p>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Nomor WhatsApp</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-3.5 text-neutral-500">📱</span>
                                    <input
                                        required
                                        type="text"
                                        value={phone}
                                        onChange={e => handlePhoneChange(e.target.value)}
                                        className={`w-full pl-11 pr-4 py-3 rounded-xl bg-[#1a1a1a] border text-white placeholder-neutral-600 focus:outline-none focus:ring-2 transition-all ${error?.includes("terdaftar") ? "border-red-500 focus:ring-red-500/50" : "border-white/5 focus:ring-brand-green/50 focus:border-brand-green/50"}`}
                                        placeholder="62812..."
                                    />
                                </div>
                                <p className="text-[10px] text-neutral-500 mt-2 ml-1">Kode OTP akan dikirim ke nomor ini.</p>
                            </div>

                            {error && <div className="text-xs text-brand-red bg-brand-red/10 p-3 rounded-lg border border-brand-red/20 flex items-center gap-2">⚠️ {error}</div>}

                            <button
                                type="submit"
                                disabled={loading || !!(error && error.includes("terdaftar"))}
                                className="w-full py-3.5 rounded-xl text-white font-bold text-base shadow-lg shadow-brand-green/20 hover:shadow-brand-green/40 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-gradient-to-r from-brand-green to-teal-500 mt-2"
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
                                    "Kirim OTP WhatsApp →"
                                )}
                            </button>

                            <p className="text-center text-xs text-neutral-500 mt-6">
                                Sudah punya akun? <Link href="/login" className="font-bold hover:underline text-brand-green hover:text-white transition-colors">Masuk disini</Link>
                            </p>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOtp} className="space-y-6">
                            <div className="text-center">
                                <p className="text-sm text-neutral-400 mb-6">
                                    Masukkan kode 6 digit yang dikirim ke <strong className="text-white">{phone}</strong>
                                </p>
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
                                <div className="flex justify-center mt-6">
                                    <button
                                        type="button"
                                        onClick={handleResendOtp}
                                        disabled={isActive || loading}
                                        className="text-xs text-brand-green font-bold hover:underline disabled:text-neutral-600 disabled:no-underline transition-colors"
                                    >
                                        {isActive ? `Kirim Ulang (${formatTime(seconds)})` : "Kirim Ulang OTP"}
                                    </button>
                                </div>
                            </div>

                            {error && <div className="text-xs text-brand-red bg-brand-red/10 p-3 rounded-lg border border-brand-red/20 text-center">⚠️ {error}</div>}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 rounded-xl text-white font-bold text-base shadow-lg shadow-brand-green/20 hover:shadow-brand-green/40 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 bg-gradient-to-r from-brand-green to-teal-500"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Verifikasi...</span>
                                    </>
                                ) : (
                                    "Konfirmasi & Masuk"
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setStep("form")}
                                className="w-full text-xs text-neutral-500 hover:text-white transition-colors"
                            >
                                ← Ganti Nomor / Edit Data
                            </button>
                        </form>
                    )}

                </div>
            </div>
        </main>
    );
}
