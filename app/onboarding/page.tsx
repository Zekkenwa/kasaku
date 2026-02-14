"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";

export default function OnboardingPage() {
    const { data: session, status, update } = useSession();
    const router = useRouter();

    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // If already has phone, redirect to dashboard
    useEffect(() => {
        if (status === "authenticated" && session?.user?.phone) {
            router.replace("/dashboard");
        } else if (status === "unauthenticated") {
            router.replace("/login");
        }
    }, [status, session, router]);

    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!phone.startsWith("62") || phone.length < 10) {
            setError("Format nomor salah (awalan 62, min 10 digit)");
            setLoading(false);
            return;
        }

        try {
            // Check duplicate first
            const check = await fetch("/api/auth/check-phone", {
                method: "POST",
                body: JSON.stringify({ phone })
            });
            const checkData = await check.json();
            if (checkData.exists) {
                setError("Nomor ini sudah digunakan oleh akun lain.");
                setLoading(false);
                return;
            }

            // Send OTP
            const res = await fetch("/api/account/verify/request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setIsOtpSent(true);
        } catch (err: any) {
            setError(err.message || "Gagal mengirim OTP");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/account/verify/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ otp })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Force session update to reflect new phone
            await update({ phone: phone });

            router.replace("/dashboard");
        } catch (err: any) {
            setError(err.message || "Gagal verifikasi OTP");
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center relative overflow-hidden"
            style={{
                background: "#111827"
            }}
        >
            <div className="relative z-10 w-full max-w-md mx-4">
                <div className="bg-gray-800 rounded-3xl shadow-xl p-8 border border-gray-700">
                    <div className="text-center mb-8">
                        <img src="/logo.png" className="w-16 h-16 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-white">Satu Langkah Lagi!</h1>
                        <p className="text-gray-400 mt-2">
                            Halo <strong>{session?.user?.name}</strong>, silakan verifikasi nomor WhatsApp Anda untuk melanjutkan.
                        </p>
                    </div>

                    {!isOtpSent ? (
                        <form onSubmit={handleRequestOtp} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Nomor WhatsApp</label>
                                <input
                                    required
                                    type="text"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value.replace(/\D/g, ""))}
                                    className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:ring-2 focus:ring-[#458B73] focus:outline-none"
                                    placeholder="628123456789"
                                />
                            </div>
                            {error && <p className="text-sm text-red-500 bg-red-50 p-2 rounded-lg">{error}</p>}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 rounded-xl text-white font-bold shadow-md hover:shadow-lg transition-transform active:scale-95 disabled:opacity-70"
                                style={{ background: "#458B73" }}
                            >
                                {loading ? "Mengirim..." : "Kirim OTP"}
                            </button>
                            <button type="button" onClick={() => signOut()} className="w-full text-sm text-gray-400 mt-2 hover:text-red-500">Ganti Akun / Logout</button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOtp} className="space-y-6">
                            <div className="text-center">
                                <p className="text-sm text-gray-400 mb-2">Kode OTP dikirim ke <strong>{phone}</strong></p>
                                <input
                                    required autoFocus
                                    type="text" maxLength={6}
                                    value={otp}
                                    onChange={e => setOtp(e.target.value)}
                                    className="w-full text-center text-3xl font-bold tracking-[1em] py-3 border-2 border-gray-600 rounded-xl focus:border-[#458B73] focus:outline-none"
                                />
                            </div>
                            {error && <p className="text-sm text-red-500 bg-red-50 p-2 rounded-lg">{error}</p>}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 rounded-xl text-white font-bold shadow-md hover:shadow-lg transition-transform active:scale-95 disabled:opacity-70"
                                style={{ background: "#458B73" }}
                            >
                                {loading ? "Memproses..." : "Verifikasi & Masuk"}
                            </button>
                            <button type="button" onClick={() => setIsOtpSent(false)} className="w-full text-sm text-gray-400">Ubah Nomor</button>
                        </form>
                    )}
                </div>
            </div>
        </main>
    );
}
