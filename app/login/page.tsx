"use client";

import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useOtpCountdown } from "@/lib/hooks";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // OTP State
  const [mode, setMode] = useState<"PASSWORD" | "OTP">("PASSWORD");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const otpTimer = useOtpCountdown();

  const [userNotFound, setUserNotFound] = useState(false);

  // Check user existence
  const checkUser = async (identifier: string) => {
    if (!identifier) return;
    try {
      const res = await fetch("/api/auth/check-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json();
      if (!data.exists) {
        setUserNotFound(true);
        return false;
      }
      setUserNotFound(false);
      return true;
    } catch (error) {
      console.error("Check user error:", error);
      return true; // Default to allowing attempt if check fails
    }
  };

  const requestOtp = async () => {
    if (isLoading) return;

    // Check if user exists before sending OTP
    const exists = await checkUser(phone);
    if (!exists) return; // Stop if user not found

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
        otpTimer.startCountdown();
      } else {
        alert(data.error || "Gagal kirim OTP");
      }
    } catch (err) { alert("Error network"); }
    setIsLoading(false);
  };

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#1E1E1E]">
      {/* Background Decoration (Stitch Style) */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-brand-green/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-brand-red/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in-up">
        <div className="bg-[#252525]/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 md:p-10 border border-white/5 relative overflow-hidden">
          {/* Top Glow inside card */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-brand-green/50 to-transparent opacity-50" />

          {/* Logo / App Name */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block mb-4 transition-transform hover:scale-105">
              <img src="/logo.png" alt="Kasaku Logo" className="w-16 h-16 rounded-xl shadow-lg mx-auto mb-2" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
              Selamat Datang Kembali!
            </h1>
            <p className="text-neutral-400 text-sm">Kelola keuanganmu dengan mudah di Kasaku.</p>
          </div>

          {/* Login Tabs */}
          <div className="flex mb-8 bg-[#1a1a1a] p-1 rounded-xl">
            <button
              onClick={() => { setMode("PASSWORD"); setOtpSent(false); setUserNotFound(false); }}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${mode === "PASSWORD" ? "bg-[#252525] text-white shadow-lg border border-white/5" : "text-neutral-500 hover:text-neutral-300"}`}
            >
              Password
            </button>
            <button
              onClick={() => { setMode("OTP"); setUserNotFound(false); }}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${mode === "OTP" ? "bg-[#252525] text-white shadow-lg border border-white/5" : "text-neutral-500 hover:text-neutral-300"}`}
            >
              No. HP (OTP)
            </button>
          </div>

          {/* PASSWORD FORM */}
          {mode === "PASSWORD" ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsLoading(true);
                // Check user before submitting
                const exists = await checkUser(email);
                if (!exists) { setIsLoading(false); return; }

                const result = await signIn("credentials", {
                  email,
                  password,
                  redirect: false,
                });
                setIsLoading(false);
                if (result?.ok) {
                  router.replace("/dashboard");
                } else {
                  alert("Email atau password salah.");
                }
              }}
              className="space-y-5"
            >
              <div>
                <label htmlFor="email" className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                  Email / Nomor WhatsApp
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-neutral-500">📧</span>
                  <input
                    id="email"
                    type="text"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setUserNotFound(false); }}
                    onBlur={() => checkUser(email)}
                    placeholder="nama@email.com/62812..."
                    required
                    className={`w-full pl-11 pr-4 py-3 rounded-xl bg-[#1a1a1a] border text-white placeholder-neutral-600 focus:outline-none focus:ring-2 transition-all ${userNotFound ? 'border-red-500 focus:ring-red-500/50' : 'border-white/5 focus:ring-brand-green/50 focus:border-brand-green/50'}`}
                  />
                </div>
                {userNotFound && (
                  <p className="text-brand-red text-xs mt-2 animate-pulse flex items-center gap-1">
                    ⚠️ Akun belum terdaftar, silahkan register.
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="password" className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-neutral-500">🔒</span>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#1a1a1a] border border-white/5 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green/50 transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <a href="/forgot-password" className="text-xs font-semibold text-brand-orange hover:text-brand-red transition-colors">
                  Lupa password?
                </a>
              </div>

              <button
                type="submit"
                disabled={userNotFound || isLoading}
                className="w-full py-3.5 rounded-xl text-white font-bold text-base shadow-lg shadow-brand-green/20 hover:shadow-brand-green/40 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-gradient-to-r from-brand-green to-teal-500"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Memproses...</span>
                  </>
                ) : (
                  "Masuk Sekarang"
                )}
              </button>
            </form>
          ) : (
            /* OTP FORM */
            <div className="space-y-5">
              {!otpSent ? (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  requestOtp();
                }}>
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Nomor WhatsApp</label>
                    <div className="relative">
                      <span className="absolute left-4 top-3.5 text-neutral-500">📱</span>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "")); setUserNotFound(false); }}
                        onBlur={() => checkUser(phone)}
                        placeholder="62812..."
                        required
                        className={`w-full pl-11 pr-4 py-3 rounded-xl bg-[#1a1a1a] border text-white placeholder-neutral-600 focus:outline-none focus:ring-2 transition-all ${userNotFound ? 'border-red-500 focus:ring-red-500/50' : 'border-white/5 focus:ring-brand-green/50 focus:border-brand-green/50'}`}
                      />
                    </div>
                    {userNotFound && (
                      <p className="text-brand-red text-xs mt-2 animate-pulse flex items-center gap-1">
                        ⚠️ Nomor belum terdaftar, silahkan register.
                      </p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || userNotFound}
                    className="w-full py-3.5 mt-4 rounded-xl text-white font-bold text-base shadow-lg shadow-brand-green/20 hover:shadow-brand-green/40 transition-all bg-gradient-to-r from-brand-green to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
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
                </form>
              ) : (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setIsLoading(true);
                  const result = await signIn("credentials", { phone, otp, redirect: false });
                  setIsLoading(false);
                  if (result?.ok) {
                    router.replace("/dashboard");
                  } else {
                    alert("Kode OTP salah atau kadaluarsa.");
                  }
                }}>
                  <div className="text-center mb-6">
                    <p className="text-sm text-neutral-400">Kode OTP terkirim ke <strong className="text-white">{phone}</strong></p>
                    <div className="flex gap-4 justify-center mt-3">
                      <button type="button" onClick={() => { setOtpSent(false); setUserNotFound(false); }} className="text-xs text-neutral-500 hover:text-white underline transition-colors">Ubah Nomor</button>
                      <button
                        type="button"
                        onClick={requestOtp}
                        disabled={otpTimer.isActive || isLoading}
                        className="text-xs text-brand-green font-bold hover:underline disabled:text-neutral-600 disabled:no-underline transition-colors"
                      >
                        {otpTimer.isActive ? `Kirim Ulang (${otpTimer.formatTime(otpTimer.seconds)})` : "Kirim Ulang"}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 text-center">Masukkan 6 Digit Kode</label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="XXXXXX"
                      required
                      maxLength={6}
                      className="w-full px-4 py-4 border border-white/10 rounded-xl bg-[#1a1a1a] text-white text-center tracking-[0.5em] font-bold text-2xl focus:outline-none focus:border-brand-green/50 focus:ring-2 focus:ring-brand-green/20 transition-all placeholder-neutral-700"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 mt-6 rounded-xl text-white font-bold text-base shadow-lg shadow-brand-green/20 hover:shadow-brand-green/40 transition-all bg-gradient-to-r from-brand-green to-teal-500 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Memverifikasi...</span>
                      </>
                    ) : (
                      "Masuk Dashboard"
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider font-bold">
              <span className="px-4 bg-[#252525] text-neutral-500 rounded">atau masuk dengan</span>
            </div>
          </div>

          {/* Google Sign In */}
          <button
            onClick={() => signIn("google")}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border border-white/10 bg-white/5 text-white font-bold hover:bg-white/10 hover:border-white/20 transition-all duration-300 group"
          >
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google Account
          </button>

          <p className="text-center text-xs text-neutral-500 mt-8">
            Dengan masuk, kamu menyetujui <a href="/syarat-ketentuan" className="underline hover:text-brand-green transition-colors">Syarat & Ketentuan</a> kami.
          </p>

          <p className="text-center text-sm text-neutral-400 mt-4">
            Belum punya akun? <a href="/register" className={`font-bold transition-all duration-300 ${userNotFound ? 'animate-pulse text-brand-red ml-1 underline' : 'text-brand-green hover:underline ml-1'}`}>Daftar Gratis</a>
          </p>
        </div>
      </div>
    </main>
  );
}
