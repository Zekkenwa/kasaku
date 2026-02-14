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
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden transition-colors duration-500"
      style={{
        background: "var(--auth-gradient)",
      }}
    >
      {/* Decorative blobs */}
      <div className="absolute top-[-120px] left-[-120px] w-80 h-80 rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--brand-yellow)" }}
      />
      <div className="absolute bottom-[-100px] right-[-100px] w-96 h-96 rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--brand-red)" }}
      />
      <div className="absolute top-1/3 right-1/4 w-40 h-40 rounded-full opacity-15 blur-2xl"
        style={{ background: "var(--brand-green)" }}
      />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="backdrop-blur-xl bg-white/90 dark:bg-gray-800/90 rounded-3xl shadow-2xl p-10 border border-white/50 dark:border-gray-700 transition-colors">
          {/* Logo / App Name */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center justify-center w-24 h-24 rounded-2xl mb-4 shadow-lg overflow-hidden transition-transform hover:scale-105"
              style={{ background: "var(--header-gradient)" }}
            >
              <img src="/logo.png" alt="Kasaku Logo" className="w-full h-full object-cover" />
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-white"
            >
              Kasaku
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Kelola keuanganmu dengan mudah</p>
          </div>

          {/* Login Tabs */}
          <div className="flex mb-6 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
            <button
              onClick={() => { setMode("PASSWORD"); setOtpSent(false); setUserNotFound(false); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === "PASSWORD" ? "bg-white dark:bg-gray-600 shadow-sm text-black dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700"}`}
            >
              Password
            </button>
            <button
              onClick={() => { setMode("OTP"); setUserNotFound(false); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === "OTP" ? "bg-white dark:bg-gray-600 shadow-sm text-black dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700"}`}
            >
              No. HP (OTP)
            </button>
          </div>

          {/* PASSWORD FORM */}
          {mode === "PASSWORD" ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                // Check user before submitting? Or allow submit to fail?
                // If we want the "red text" behavior, we should check first.
                const exists = await checkUser(email);
                if (!exists) return;

                const result = await signIn("credentials", {
                  email,
                  password,
                  redirect: false,
                });
                if (result?.ok) {
                  router.replace("/dashboard");
                } else {
                  alert("Email atau password salah.");
                }
              }}
              className="space-y-4 mb-6"
            >
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Email / Nomor WhatsApp
                </label>
                <input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setUserNotFound(false); }}
                  onBlur={() => checkUser(email)}
                  placeholder="nama@email.com atau 62812..."
                  required
                  className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-700 text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow ${userNotFound ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-gray-600 focus:ring-[#458B73]'}`}
                />
                {userNotFound && (
                  <p className="text-red-500 text-xs mt-1 animate-pulse">
                    Akun belum terdaftar, silahkan register.
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow"
                />
              </div>

              <div className="text-right">
                <a href="/forgot-password" className="text-sm hover:underline" style={{ color: "#F26076" }}>
                  Lupa password?
                </a>
              </div>

              <button
                type="submit"
                disabled={userNotFound || isLoading} // Added isLoading to disabled
                className="w-full py-3 rounded-xl text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #458B73 0%, #458B73 100%)" }}
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
                  "Masuk"
                )}
              </button>
            </form>
          ) : (
            /* OTP FORM */
            <div className="space-y-4 mb-6">
              {!otpSent ? (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  requestOtp();
                }}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nomor WhatsApp</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "")); setUserNotFound(false); }}
                      onBlur={() => checkUser(phone)}
                      placeholder="62812..."
                      required
                      className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-700 text-black dark:text-white ${userNotFound ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-gray-600'}`}
                    />
                    {userNotFound && (
                      <p className="text-red-500 text-xs mt-1 animate-pulse">
                        Nomor belum terdaftar, silahkan register.
                      </p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || userNotFound}
                    className="w-full py-3 mt-4 rounded-xl text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all bg-[#458B73] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Mengirim...</span>
                      </>
                    ) : (
                      "Kirim OTP Login"
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
                  <div className="text-center mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Kode OTP terkirim ke <strong>{phone}</strong></p>
                    <div className="flex gap-4 justify-center mt-2">
                      <button type="button" onClick={() => { setOtpSent(false); setUserNotFound(false); }} className="text-xs text-gray-500 hover:text-gray-700 underline">Ubah Nomor</button>
                      <button
                        type="button"
                        onClick={requestOtp}
                        disabled={otpTimer.isActive || isLoading}
                        className="text-xs text-[#458B73] hover:underline disabled:text-gray-400 disabled:no-underline"
                      >
                        {otpTimer.isActive ? `Kirim Ulang (${otpTimer.formatTime(otpTimer.seconds)})` : "Kirim Ulang"}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Kode OTP</label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="XXXXXX"
                      required
                      maxLength={6}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-black dark:text-white text-center tracking-widest font-bold text-lg"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 mt-4 rounded-xl text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all bg-[#458B73] flex items-center justify-center gap-2"
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
                      "Masuk"
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white/90 dark:bg-gray-800 text-gray-400 dark:text-gray-500 rounded">atau</span>
            </div>
          </div>

          {/* Google Sign In */}
          <button
            onClick={() => signIn("google")}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium text-base hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-300 hover:shadow-md cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
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
            Daftar / Masuk dengan Google
          </button>

          <p className="text-center text-xs text-gray-400 mt-6">
            Dengan masuk, kamu setuju dengan <a href="/syarat-ketentuan" className="underline hover:text-[#458B73]">Syarat & Ketentuan</a> kami
          </p>

          <p className="text-center text-sm text-gray-600 mt-4">
            Belum punya akun? <a href="/register" className={`font-bold hover:underline transition-all duration-300 ${userNotFound ? 'animate-pulse text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] scale-110' : 'text-[#458B73]'}`} style={{ display: 'inline-block' }}>Daftar sekarang</a>
          </p>
        </div>
      </div>
    </main>
  );
}
