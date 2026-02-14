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
        <main className="min-h-screen flex items-center justify-center relative overflow-hidden transition-colors duration-500"
            style={{
                background: "var(--auth-gradient)",
            }}
        >
            {/* Decorative blobs - Same as Login */}
            <div className="absolute top-[-120px] left-[-120px] w-80 h-80 rounded-full opacity-30 blur-3xl" style={{ background: "var(--brand-yellow)" }} />
            <div className="absolute bottom-[-100px] right-[-100px] w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: "var(--brand-red)" }} />

            <div className="relative z-10 w-full max-w-md mx-4">
                <div className="backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 rounded-3xl shadow-2xl p-10 border border-white/50 dark:border-gray-700 transition-colors">

                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold text-white">Daftar Akun Baru</h1>
                        <p className="text-gray-400 text-sm mt-1">
                            {step === "form" ? "Isi data diri untuk memulai" : "Verifikasi Nomor WhatsApp"}
                        </p>
                    </div>

                    {step === "form" ? (
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Nama Lengkap</label>
                                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#458B73] focus:outline-none" placeholder="Nama Anda" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#458B73] focus:outline-none" placeholder="email@contoh.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
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
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Ulangi Password</label>
                                <div className="relative">
                                    <input
                                        required
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#458B73] focus:outline-none ${password && confirmPassword && password !== confirmPassword ? "border-red-500 bg-red-50/10" : "border-gray-200"}`}
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                                    >
                                        {showConfirmPassword ? (
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
                                {password && confirmPassword && password !== confirmPassword && (
                                    <p className="text-xs text-red-400 mt-1 ml-1">Password tidak cocok</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Nomor WhatsApp</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-gray-400 text-sm">📞</span>
                                    <input
                                        required
                                        type="text"
                                        value={phone}
                                        onChange={e => handlePhoneChange(e.target.value)}
                                        className={`w-full pl-9 px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#458B73] focus:outline-none ${error?.includes("terdaftar") ? "border-red-500 bg-red-50" : "border-gray-200"}`}
                                        placeholder="628123456789"
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">Kode OTP akan dikirim ke nomor ini.</p>
                            </div>

                            {error && <p className="text-sm text-red-500 text-center bg-red-50 p-2 rounded-lg">{error}</p>}

                            <button
                                type="submit"
                                disabled={loading || !!(error && error.includes("terdaftar"))}
                                className="w-full py-3 rounded-xl text-white font-bold shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ background: "linear-gradient(135deg, #458B73 0%, #458B73 100%)" }}
                            >
                                {loading ? "Memproses..." : "Kirim OTP WhatsApp →"}
                            </button>

                            <p className="text-center text-sm text-gray-600 mt-4">
                                Sudah punya akun? <Link href="/login" className="font-bold hover:underline text-[#458B73]">Masuk disini</Link>
                            </p>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOtp} className="space-y-6">
                            <div className="text-center">
                                <p className="text-sm text-gray-600 mb-4">
                                    Masukkan kode 6 digit yang dikirim ke <strong>{phone}</strong>
                                </p>
                                <input
                                    required
                                    autoFocus
                                    type="text"
                                    maxLength={6}
                                    value={otp}
                                    onChange={e => setOtp(e.target.value)}
                                    className="w-full text-center text-3xl font-bold tracking-[1em] py-4 border-2 border-gray-200 rounded-xl focus:border-[#458B73] focus:outline-none"
                                    placeholder="XXXXXX"
                                />
                                <div className="flex justify-center mt-4">
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

                            {error && <p className="text-sm text-red-500 text-center bg-red-50 p-2 rounded-lg">{error}</p>}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 rounded-xl text-white font-bold shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                                style={{ background: "linear-gradient(135deg, #458B73 0%, #458B73 100%)" }}
                            >
                                {loading ? "Verifikasi..." : "Konfirmasi & Masuk"}
                            </button>

                            <button
                                type="button"
                                onClick={() => setStep("form")}
                                className="w-full text-sm text-gray-500 hover:text-black"
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
