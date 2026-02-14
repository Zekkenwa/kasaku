"use client";

import { useState } from "react";
import { signOut, signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOtpCountdown } from "@/lib/hooks";
import Footer from "@/components/Footer";

type UserData = {
  name: string | null;
  email: string | null;
  phone: string | null;
  image: string | null;
  hasPassword?: boolean;
  isGoogleLinked: boolean;
  monthlyReportOptIn: boolean;
  deleteRequestedAt: Date | null;
  deleteScheduledAt: Date | null;
};

export default function AccountSettingsClient({ user }: { user: UserData }) {
  const [name, setName] = useState(user.name ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [monthlyReportOptIn, setMonthlyReportOptIn] = useState(user.monthlyReportOptIn);
  const [status, setStatus] = useState<string | null>(null);
  const [deleteInfo, setDeleteInfo] = useState<Date | null>(
    user.deleteScheduledAt ? new Date(user.deleteScheduledAt) : null
  );

  // Email State
  const router = useRouter();
  const [showEmail, setShowEmail] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState(user.email ?? "");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailStep, setEmailStep] = useState<"INPUT" | "OTP">("INPUT");
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  // Verification State
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Password Creation State
  const [passwordStep, setPasswordStep] = useState(false); // false = button, true = form
  const [passwordOtp, setPasswordOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Change Password State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changePassOtp, setChangePassOtp] = useState("");
  const [changePassNew, setChangePassNew] = useState("");
  const [changePassConfirm, setChangePassConfirm] = useState("");
  const [changePassStep, setChangePassStep] = useState<"IDLE" | "OTP_SENT">("IDLE");
  const [changePassStatus, setChangePassStatus] = useState<string | null>(null);

  const requestChangePassOtp = async () => {
    setLoadingPassword(true);
    setChangePassStatus(null);
    try {
      const res = await fetch("/api/account/password/change", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request_otp" })
      });
      const data = await res.json();
      if (res.ok) {
        setChangePassStep("OTP_SENT");
        changePassTimer.startCountdown();
      }
      else setChangePassStatus(data.error || "Gagal kirim OTP");
    } catch { setChangePassStatus("Network error"); }
    setLoadingPassword(false);
  };

  const doChangePassword = async () => {
    if (changePassNew !== changePassConfirm) {
      setChangePassStatus("Password konfirmasi tidak cocok");
      return;
    }
    setLoadingPassword(true);
    try {
      const res = await fetch("/api/account/password/change", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "change_password", otp: changePassOtp, newPassword: changePassNew })
      });
      const data = await res.json();
      if (res.ok) {
        setChangePassStatus("Berhasil! Password diubah.");
        setTimeout(() => { setIsChangingPassword(false); setChangePassStep("IDLE"); }, 2000);
      } else {
        setChangePassStatus(data.error || "Gagal ubah password");
      }
    } catch { setChangePassStatus("Network error"); }
    setLoadingPassword(false);
  };

  // Timers
  const verifyTimer = useOtpCountdown();
  const passwordTimer = useOtpCountdown();
  const emailTimer = useOtpCountdown();
  const changePassTimer = useOtpCountdown();

  const requestPasswordOtp = async () => {
    setLoadingPassword(true);
    setPasswordError(null);
    try {
      const res = await fetch("/api/account/password/request-otp", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setPasswordStep(true);
        passwordTimer.startCountdown();
      } else {
        setPasswordError(data.error || "Gagal kirim OTP");
      }
    } catch (e) {
      setPasswordError("Kesalahan jaringan");
    } finally {
      setLoadingPassword(false);
    }
  };

  const createPassword = async () => {
    if (!passwordOtp || newPassword.length < 6) {
      setPasswordError("OTP wajib diisi dan password min 6 karakter");
      return;
    }
    setLoadingPassword(true);
    setPasswordError(null);
    try {
      const res = await fetch("/api/account/password/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: passwordOtp, password: newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordSuccess(true);
        setTimeout(() => {
          window.location.reload(); // Reload to update session/user state
        }, 1500);
      } else {
        setPasswordError(data.error || "Gagal membuat password");
      }
    } catch (e) {
      setPasswordError("Kesalahan jaringan");
    } finally {
      setLoadingPassword(false);
    }
  };

  const save = async () => {
    setStatus("Menyimpan...");
    // Only update name and opt-in preference here (phone is handled via verification)
    const res = await fetch("/api/account/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, monthlyReportOptIn }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setStatus(data.error ?? "Gagal menyimpan");
      return;
    }
    setStatus("Tersimpan!");
    router.refresh();
    setTimeout(() => setStatus(null), 3000);
  };

  const requestEmailOtp = async () => {
    setEmailStatus("Mengirim OTP...");
    try {
      const res = await fetch("/api/account/email/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request_otp" }),
      });
      const data = await res.json();

      if (!res.ok) {
        setEmailStatus(data.error || "Gagal kirim OTP");
        return;
      }

      setEmailStep("OTP");
      setEmailStatus("OTP terkirim ke WhatsApp Anda");
      emailTimer.startCountdown();
    } catch (e) {
      setEmailStatus("Gagal menghubungi server");
    }
  };

  const saveEmail = async () => {
    setEmailStatus("Memverifikasi...");
    const res = await fetch("/api/account/email/change", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm_change", otp: emailOtp, newEmail: emailInput }),
    });
    const data = await res.json();
    if (!res.ok) {
      setEmailStatus(data.error || "Gagal update email");
      return;
    }
    setEmailStatus("Email berhasil diubah!");
    setIsEditingEmail(false);
    setEmailStep("INPUT");
    setEmailOtp("");
    router.refresh();
    setTimeout(() => setEmailStatus(null), 3000);
  };

  const unlinkGoogle = async () => {
    if (!user.hasPassword) {
      alert("⚠️ ANDA BELUM MEMILIKI PASSWORD!\n\nDemi keamanan akses akun, silakan buat password terlebih dahulu di menu 'Keamanan Login' di bawah, sebelum memutuskan akun Google.");
      return;
    }
    if (!confirm("Yakin ingin memutuskan koneksi Google? Anda harus menggunakan password/email untuk login selanjutnya.")) return;

    const res = await fetch("/api/account/google/unlink", { method: "DELETE" });
    const data = await res.json();

    if (res.ok) {
      alert("Akun Google berhasil diputuskan.");
      router.refresh();
    } else {
      alert(data.error || "Gagal unlink");
    }
  };

  const verifyPhone = async () => {
    setVerifyError(null);
    if (!phone.startsWith("62") || phone.length < 10 || phone.length > 13) {
      setVerifyError("Nomor harus format 62 dan panjang 10-13 digit...");
      return;
    }

    // If timer is active, don't allow immediate resend unless it's the first time
    if (otpSent && verifyTimer.isActive) return;

    try {
      setIsVerifying(true); // Start verify mode
      const res = await fetch("/api/account/verify/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
        verifyTimer.startCountdown();
      } else {
        setIsVerifying(false);
        setVerifyError(data.error || "Gagal mengirim OTP");
      }
    } catch {
      setIsVerifying(false);
      setVerifyError("Terjadi kesalahan network");
    }
  };

  const confirmOtp = async () => {
    setVerifyError(null);
    try {
      const res = await fetch("/api/account/verify/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp, optIn: monthlyReportOptIn }),
      });
      const data = await res.json();
      if (res.ok) {
        // Phone is already set in state, just confirm UI
        setIsVerifying(false);
        setOtpSent(false);
        setOtp("");
        setStatus("Nomor berhasil diverifikasi!");
        setTimeout(() => setStatus(null), 3000);
      } else {
        setVerifyError(data.error || "Gagal verifikasi OTP");
      }
    } catch {
      setVerifyError("Terjadi kesalahan network");
    }
  };

  const requestDelete = async () => {
    const ok = confirm(
      "Yakin request hapus akun? Anda akan otomatis logout.\n\nLogin kembali untuk membatalkan penghapusan."
    );
    if (!ok) return;

    const res = await fetch("/api/account/request-delete", { method: "POST" });
    if (res.ok) {
      await signOut({ callbackUrl: "/" });
    }
  };

  const sideMargin = "clamp(2rem, 8vw, 8rem)";

  // Check if phone matches initial user phone (verified)
  const isModified = phone !== user.phone;
  const isValidPhone = phone.startsWith("62") && phone.length >= 10 && phone.length <= 13;
  const [showPhone, setShowPhone] = useState(true);

  return (
    <main className="min-h-screen transition-colors duration-300 dark:bg-gray-900" style={{ background: "var(--background)" }}>
      {/* ===== HEADER ===== */}
      <div className="pt-8 pb-14 rounded-b-3xl shadow-sm relative overflow-hidden" style={{ background: "linear-gradient(135deg, #458B73 0%, #458B73 60%, #FFD150 100%)", paddingLeft: sideMargin, paddingRight: sideMargin }}>
        <header className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-8 relative z-10">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Kasaku" className="w-10 h-10 rounded-xl shadow-lg" />
            <h1 className="text-2xl font-bold text-white drop-shadow-sm">Pengaturan Akun</h1>
          </div>
          <Link href="/dashboard" className="w-full md:w-auto text-center px-4 py-2 rounded-xl text-sm font-medium bg-white/20 text-white border border-white/30 hover:bg-white/30 backdrop-blur-sm transition-colors shadow-sm">
            ← Kembali ke Dashboard
          </Link>
        </header>

        {/* Decorative Circles */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-yellow-400/20 blur-2xl pointer-events-none"></div>

        {/* PROFILE CARD */}
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm p-8 rounded-2xl shadow-lg flex flex-col md:flex-row items-center gap-8 relative z-10 transition-colors duration-300">
          <div className="relative">
            <img
              src={user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || "User")}&background=random`}
              alt="Profile"
              className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-700 shadow-md object-cover"
            />
            {user.isGoogleLinked && (
              <div className="absolute bottom-0 right-0 bg-blue-500 text-white p-1.5 rounded-full border-2 border-white dark:border-gray-800 shadow-sm" title="Terhubung dengan Google">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" /></svg>
              </div>
            )}
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-2xl font-bold text-black dark:text-white">{user.name}</h2>

            <div className="flex items-center gap-2 justify-center md:justify-start mt-1">
              <p className="text-gray-500 dark:text-gray-400 font-mono">
                {showEmail ? user.email : user.email?.replace(/(.{2})(.*)(@.*)/, "$1***$3")}
              </p>
              <button onClick={() => setShowEmail(!showEmail)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                {showEmail ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                )}
              </button>
            </div>

            <div className="flex gap-2 mt-3 justify-center md:justify-start">
              <button onClick={() => setIsEditingEmail(!isEditingEmail)} className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-300 transition-colors">
                Ganti Email
              </button>
              {user.isGoogleLinked ? (
                <button onClick={unlinkGoogle} className="text-xs px-3 py-1.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400 transition-colors">
                  Putuskan Google
                </button>
              ) : (
                <button onClick={() => signIn("google")} className="text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 transition-colors flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" /></svg>
                  Hubungkan Google
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== CONTENT ===== */}
      <div className="py-10 space-y-8" style={{ paddingLeft: sideMargin, paddingRight: sideMargin }}>

        {/* FORM SETTINGS */}
        <div className="bg-white dark:bg-gray-800 card-fix p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 max-w-3xl mx-auto transition-colors duration-300">
          <h3 className="font-bold text-lg text-black dark:text-gray-200 mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">Edit Informasi</h3>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-black dark:text-gray-300 mb-1">Nama Tampilan</label>
              <input
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#458B73] bg-white dark:bg-gray-700 text-black dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama Anda"
              />
            </div>

            {/* Change Email Form (Expandable) */}
            {isEditingEmail && (
              <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600 animate-in fade-in slide-in-from-top-2">
                <label className="block text-sm font-medium text-black dark:text-gray-300 mb-1">Email Baru</label>
                <div className="flex gap-2 mb-3">
                  <input
                    className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#458B73] bg-white dark:bg-gray-800 text-black dark:text-gray-200"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="email@baru.com"
                    disabled={emailStep === "OTP"}
                  />
                </div>

                {emailStep === "INPUT" ? (
                  <button onClick={requestEmailOtp} className="w-full px-4 py-2 bg-[#458B73] text-white rounded-lg text-sm font-medium hover:shadow-md transition-all">
                    Kirim OTP ke WhatsApp
                  </button>
                ) : (
                  <div className="space-y-3 animate-in fade-in">
                    <div className="flex justify-between items-center bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-100 dark:border-green-800">
                      <p className="text-xs text-green-700 dark:text-green-300">OTP telah dikirim ke nomor WhatsApp Anda.</p>
                      <button
                        onClick={requestEmailOtp}
                        disabled={emailTimer.isActive}
                        className="text-xs text-[#458B73] hover:underline disabled:text-gray-400 disabled:no-underline"
                      >
                        {emailTimer.isActive ? `Kirim Ulang (${emailTimer.formatTime(emailTimer.seconds)})` : "Kirim Ulang"}
                      </button>
                    </div>
                    <input
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-center tracking-widest font-bold focus:outline-none focus:ring-2 focus:ring-[#458B73] bg-white dark:bg-gray-800 text-black dark:text-gray-200"
                      value={emailOtp}
                      onChange={(e) => setEmailOtp(e.target.value)}
                      placeholder="KODE OTP"
                      maxLength={6}
                    />
                    <button onClick={saveEmail} className="w-full px-4 py-2 bg-[#458B73] text-white rounded-lg text-sm font-medium hover:shadow-md transition-all">
                      Verifikasi & Simpan Email
                    </button>
                    <button onClick={() => setEmailStep("INPUT")} className="w-full text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400">
                      Batal / Ubah Email
                    </button>
                  </div>
                )}

                {emailStatus && <p className={`text-xs mt-3 ${emailStatus.includes("Gagal") || emailStatus.includes("error") ? "text-red-500" : "text-[#458B73]"}`}>{emailStatus}</p>}
                <p className="text-[10px] text-gray-500 mt-2">Note: Anda hanya dapat mengubah email sekali setiap 14 hari.</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-black dark:text-gray-300 mb-1">Nomor WhatsApp</label>
              <div className="flex gap-2 items-start">
                <div className="relative flex-1 group">
                  <span className="absolute left-4 top-3 text-gray-400 dark:text-gray-500 text-sm">📞</span>
                  <input
                    type={showPhone ? "text" : "password"}
                    className={`w-full border rounded-xl pl-10 pr-24 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#458B73] bg-white dark:bg-gray-700 text-black dark:text-gray-200 transition-colors ${otpSent ? "bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400" : ""} ${!isModified && user.phone ? "border-green-500/50 bg-green-50/30 dark:bg-green-900/20 dark:border-green-500/30" : "border-gray-200 dark:border-gray-600"}`}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="628123456789"
                    disabled={otpSent}
                  />

                  <div className="absolute right-3 top-2.5 flex items-center gap-2">
                    {/* Success Indicator */}
                    {!isModified && user.phone && (
                      <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded-full animate-in fade-in zoom-in">
                        Verifikasi Berhasil
                      </span>
                    )}

                    {/* Visibility Toggle */}
                    <button
                      onClick={() => setShowPhone(!showPhone)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      title={showPhone ? "Sembunyikan nomor" : "Tampilkan nomor"}
                    >
                      {showPhone ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {otpSent && <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Mengirim ke nomor diatas...</p>}
                </div>

                {/* Verify Button - Only show if number is modified OR OTP is sent (to allow Retry/Change) */}
                {(isModified || otpSent) && (
                  !otpSent ? (
                    <button
                      onClick={verifyPhone}
                      disabled={!isValidPhone || isVerifying || verifyTimer.isActive}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium text-white shadow-sm transition-all whitespace-nowrap ${(!isValidPhone || verifyTimer.isActive) ? "bg-gray-300 dark:bg-gray-600 cursor-not-allowed" : "bg-[#458B73] hover:shadow-md active:scale-95"}`}
                    >
                      {isVerifying ? "..." : (verifyTimer.isActive ? verifyTimer.formatTime(verifyTimer.seconds) : "Verifikasi")}
                    </button>
                  ) : (
                    <button
                      onClick={() => { setOtpSent(false); setIsVerifying(false); }}
                      className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all whitespace-nowrap"
                    >
                      Ubah
                    </button>
                  )
                )}
              </div>
              {verifyError && <p className="text-xs text-red-500 mt-1">{verifyError}</p>}
              {!isValidPhone && isModified && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Nomor harus diawali 62 dan panjang 10-13 digit.</p>}

              {/* OTP INPUT (INLINE) */}
              {otpSent && (
                <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm text-black dark:text-gray-300 font-medium">Masukkan Kode OTP:</p>
                    <button
                      onClick={verifyPhone}
                      disabled={verifyTimer.isActive}
                      className="text-xs text-[#458B73] hover:underline disabled:text-gray-400 disabled:no-underline"
                    >
                      {verifyTimer.isActive ? `Kirim Ulang (${verifyTimer.formatTime(verifyTimer.seconds)})` : "Kirim Ulang"}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#458B73] text-center tracking-widest font-bold bg-white dark:bg-gray-800 text-black dark:text-gray-200"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="XXXXXX"
                      maxLength={6}
                      autoFocus
                    />
                    <button
                      onClick={confirmOtp}
                      className="px-6 py-2.5 rounded-xl font-semibold text-white bg-[#458B73] shadow-sm hover:shadow-md transition-all active:scale-95"
                    >
                      Konfirmasi
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Cek terminal saat ini untuk kode OTP (mode testing).</p>
                </div>
              )}
            </div>

            {/* SECURITY SECTION */}
            <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
              <h4 className="font-semibold text-black dark:text-gray-200 mb-4">Keamanan Login</h4>

              {/* Case 1: Create Password (No Password) */}
              {!user.hasPassword && (
                !passwordStep ? (
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/30 rounded-xl p-4">
                    <p className="text-sm text-orange-800 dark:text-orange-200 mb-3">
                      Anda login menggunakan Google dan belum memiliki password. Buat password untuk login menggunakan email & password.
                    </p>
                    <button
                      onClick={requestPasswordOtp}
                      disabled={loadingPassword}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 transition-all shadow-sm"
                    >
                      {loadingPassword ? "Memproses..." : "Buat Password"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 bg-gray-50 dark:bg-gray-700/30 p-5 rounded-xl border border-gray-200 dark:border-gray-600 animate-in fade-in slide-in-from-top-2">
                    {/* ... existing Create Password Form content ... */}
                    <div className="flex justify-between items-start">
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Kode OTP terkirim ke <strong>{user.phone}</strong></p>
                      <button onClick={requestPasswordOtp} disabled={passwordTimer.isActive || loadingPassword} className="text-xs text-[#458B73] hover:underline disabled:text-gray-400">
                        {passwordTimer.isActive ? `Kirim Ulang (${passwordTimer.formatTime(passwordTimer.seconds)})` : "Kirim Ulang"}
                      </button>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Kode OTP</label>
                      <input className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-center tracking-widest font-bold bg-white dark:bg-gray-800 text-black dark:text-gray-200"
                        value={passwordOtp} onChange={(e) => setPasswordOtp(e.target.value)} placeholder="XXXXXX" maxLength={6} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Password Baru</label>
                      <input type="password" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-black dark:text-gray-200"
                        value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 karakter" />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button onClick={createPassword} disabled={loadingPassword} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#458B73] hover:shadow-md transition-all">
                        {loadingPassword ? "Menyimpan..." : "Simpan Password"}
                      </button>
                      <button onClick={() => setPasswordStep(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50">Batal</button>
                    </div>
                  </div>
                )
              )}

              {/* Case 2: Change Password (Has Password) */}
              {user.hasPassword && (
                !isChangingPassword ? (
                  <button
                    onClick={() => setIsChangingPassword(true)}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors border border-gray-200 dark:border-gray-600"
                  >
                    Ubah Password
                  </button>
                ) : (
                  <div className="space-y-4 bg-gray-50 dark:bg-gray-700/30 p-5 rounded-xl border border-gray-200 dark:border-gray-600 animate-in fade-in slide-in-from-top-2">
                    <h5 className="font-semibold text-sm text-gray-800 dark:text-gray-200">Ubah Password</h5>

                    {changePassStep === "IDLE" ? (
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Untuk keamanan, kami akan mengirimkan OTP ke nomor WhatsApp Anda sebelum mengubah password.</p>
                        <div className="flex gap-2">
                          <button onClick={requestChangePassOtp} disabled={loadingPassword} className="px-4 py-2 bg-[#458B73] text-white rounded-lg text-sm font-medium hover:shadow-md transition-all">
                            {loadingPassword ? "Mengirim..." : "Kirim OTP"}
                          </button>
                          <button onClick={() => setIsChangingPassword(false)} className="px-4 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">Batal</button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-100 dark:border-green-800">
                          <p className="text-xs text-green-700 dark:text-green-300">OTP terkirim ke WhatsApp Anda.</p>
                          <button
                            onClick={requestChangePassOtp}
                            disabled={changePassTimer.isActive || loadingPassword}
                            className="text-xs text-[#458B73] hover:underline disabled:text-gray-400 disabled:no-underline"
                          >
                            {changePassTimer.isActive ? `Kirim Ulang (${changePassTimer.formatTime(changePassTimer.seconds)})` : "Kirim Ulang"}
                          </button>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Kode OTP</label>
                          <input className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-center tracking-widest font-bold bg-white dark:bg-gray-800 text-black dark:text-gray-200"
                            value={changePassOtp} onChange={(e) => setChangePassOtp(e.target.value)} placeholder="XXXXXX" maxLength={6} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Password Baru</label>
                          <input type="password" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-black dark:text-gray-200"
                            value={changePassNew} onChange={(e) => setChangePassNew(e.target.value)} placeholder="Min 6 karakter" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Konfirmasi Password Baru</label>
                          <input type="password" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-black dark:text-gray-200"
                            value={changePassConfirm} onChange={(e) => setChangePassConfirm(e.target.value)} placeholder="Ulangi password baru" />
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button onClick={doChangePassword} disabled={loadingPassword} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#458B73] hover:shadow-md transition-all">
                            {loadingPassword ? "Menyimpan..." : "Simpan Password Baru"}
                          </button>
                          <button onClick={() => setChangePassStep("IDLE")} className="px-4 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">Kembali</button>
                        </div>
                      </div>
                    )}
                    {changePassStatus && <p className={`text-xs mt-2 ${changePassStatus.includes("Berhasil") ? "text-green-600" : "text-red-500"}`}>{changePassStatus}</p>}
                  </div>
                )
              )}
              {passwordError && <p className="text-xs text-red-500 mt-2">{passwordError}</p>}
              {passwordSuccess && <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">Password berhasil dibuat! Silakan login ulang jika diperlukan.</p>}
            </div>

            <div className="pt-2">
              <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                <input
                  type="checkbox"
                  checked={monthlyReportOptIn}
                  onChange={(e) => setMonthlyReportOptIn(e.target.checked)}
                  className="mt-1 accent-[#458B73] w-4 h-4"
                />
                <div>
                  <span className="block text-sm font-semibold text-black dark:text-gray-200">Kirim Laporan Bulanan via WhatsApp</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">Kami akan mengirimkan ringkasan keuangan Anda melalui WhatsApp setiap awal bulan. Pastikan nomor di atas benar.</span>
                </div>
              </label>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <button
                onClick={save}
                className="px-6 py-2.5 rounded-xl font-semibold text-white shadow-md hover:shadow-lg transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #458B73, #458B73dd)" }}
              >
                Simpan Perubahan
              </button>
              {status && <span className={`text-sm font-medium ${status.includes("Gagal") ? "text-red-500" : "text-[#458B73]"}`}>{status}</span>}
            </div>
          </div>
        </div>

        {/* DANGER ZONE & DATA */}
        <div className="bg-white dark:bg-gray-800 card-fix p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 max-w-3xl mx-auto transition-colors duration-300">
          <h3 className="font-bold text-lg text-black dark:text-gray-200 mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">Data & Keamanan</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-900/10">
              <div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-300 text-sm">Download Data</h4>
                <p className="text-xs text-blue-700 dark:text-blue-400">Unduh seluruh riwayat transaksi Anda dalam format CSV.</p>
              </div>
              <a href="/api/account/report" className="px-4 py-2 bg-white dark:bg-gray-800 card-fix text-blue-600 dark:text-blue-400 text-sm font-medium rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
                Download
              </a>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10">
              <div>
                <h4 className="font-semibold text-red-900 dark:text-red-300 text-sm">Hapus Akun</h4>
                <p className="text-xs text-red-700 dark:text-red-400">Tindakan ini tidak dapat dibatalkan. Data Anda akan dihapus permanen.</p>
                {deleteInfo && (
                  <p className="text-xs font-bold text-red-600 dark:text-red-400 mt-1">
                    Dijadwalkan hapus pada: {deleteInfo.toLocaleString("id-ID")}
                  </p>
                )}
              </div>
              <button onClick={requestDelete} className="px-4 py-2 bg-white dark:bg-gray-800 card-fix text-red-600 dark:text-red-400 text-sm font-medium rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
                {deleteInfo ? "Batalkan Hapus" : "Hapus Akun"}
              </button>
            </div>
          </div>
        </div>

      </div>
      <Footer />
    </main>
  );
}