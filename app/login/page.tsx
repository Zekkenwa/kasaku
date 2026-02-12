"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #F26076 0%, #FF9760 35%, #FFD150 65%, #458B73 100%)",
      }}
    >
      {/* Decorative blobs */}
      <div className="absolute top-[-120px] left-[-120px] w-80 h-80 rounded-full opacity-30"
        style={{ background: "radial-gradient(circle, #FFD150 0%, transparent 70%)" }}
      />
      <div className="absolute bottom-[-100px] right-[-100px] w-96 h-96 rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, #F26076 0%, transparent 70%)" }}
      />
      <div className="absolute top-1/3 right-1/4 w-40 h-40 rounded-full opacity-15"
        style={{ background: "radial-gradient(circle, #458B73 0%, transparent 70%)" }}
      />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="backdrop-blur-xl bg-white/90 rounded-3xl shadow-2xl p-10 border border-white/50">
          {/* Logo / App Name */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 shadow-lg overflow-hidden"
              style={{ background: "linear-gradient(135deg, #458B73, #FFD150)" }}
            >
              <img src="/logo.png" alt="Kasaku Logo" className="w-16 h-16 object-contain" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight"
              style={{ color: "#2d2d2d" }}
            >
              Kasaku
            </h1>
            <p className="text-gray-500 mt-1 text-sm">Kelola keuanganmu dengan mudah</p>
          </div>

          {/* Email/Password Form */}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
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
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#458B73] focus:border-transparent transition-shadow"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow"
              />
            </div>

            <div className="text-right">
              <a href="#" className="text-sm hover:underline" style={{ color: "#F26076" }}>
                Lupa password?
              </a>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #458B73 0%, #458B73 100%)",
              }}
            >
              Masuk
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white/90 text-gray-400">atau</span>
            </div>
          </div>

          {/* Google Sign In */}
          <button
            onClick={() => signIn("google")}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-700 font-medium text-base hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 hover:shadow-md cursor-pointer"
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
            Dengan masuk, kamu setuju dengan <a href="#" className="underline">Syarat & Ketentuan</a> kami
          </p>
        </div>
      </div>
    </main>
  );
}
