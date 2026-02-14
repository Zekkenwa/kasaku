"use client";

import { signOut, signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import EmailChangeModal from "@/components/EmailChangeModal";
import PhoneChangeModal from "@/components/PhoneChangeModal";

type User = {
  name: string | null;
  email: string | null;
  phone: string | null;
  image: string | null;
  monthlyReportOptIn: boolean;
  deleteRequestedAt: Date | null;
  deleteScheduledAt: Date | null;
  hasPassword: boolean;
  isGoogleLinked: boolean;
  googleEmail?: string;
};

export default function AccountSettingsClient({ user }: { user: User }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [optIn, setOptIn] = useState(user.monthlyReportOptIn);

  // Privacy States
  const [showEmail, setShowEmail] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isEmailChangeOpen, setIsEmailChangeOpen] = useState(false);
  const [isPhoneChangeOpen, setIsPhoneChangeOpen] = useState(false);
  const [googleLinked, setGoogleLinked] = useState(user.isGoogleLinked);
  const [unlinkingGoogle, setUnlinkingGoogle] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    await signOut({ callbackUrl: "/login" });
  };

  const handleDeleteAccount = () => {
    if (window.confirm("Apakah anda yakin ingin menghapus akun? Tindakan ini tidak dapat dibatalkan.")) {
      alert("Fitur hapus akun akan segera tersedia.");
    }
  };

  const handleUnlinkGoogle = async () => {
    if (!user.hasPassword) {
      alert("Anda harus membuat password terlebih dahulu sebelum memutuskan sambungan Google.");
      return;
    }
    if (!confirm("Yakin ingin memutuskan sambungan Google?")) return;

    setUnlinkingGoogle(true);
    try {
      const res = await fetch("/api/account/google/unlink", { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setGoogleLinked(false);
        alert("Sambungan Google berhasil diputuskan.");
      } else {
        alert(data.error || "Gagal memutuskan sambungan Google.");
      }
    } catch {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setUnlinkingGoogle(false);
    }
  };

  const toggleOptIn = async () => {
    setOptIn(!optIn);
    // API call would go here
  };

  // Masking Helpers
  const maskEmail = (email: string | null) => {
    if (!email) return "-";
    const [local, domain] = email.split("@");
    if (!local || !domain) return email;
    const visible = local.substring(0, 3);
    return `${visible}***@${domain}`;
  };

  const maskPhone = (phone: string | null) => {
    if (!phone) return "-";
    if (phone.length <= 4) return phone;
    const last4 = phone.slice(-4);
    return `****-****-${last4}`;
  };

  return (
    <div className="p-4 md:p-8 relative">
      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Link href="/dashboard" className="absolute top-8 left-4 md:left-8 text-neutral-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium">
          <span>←</span> Kembali
        </Link>

        {/* Header - Name only, no email */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative group">
            <div className="absolute inset-0 bg-[#458B73]/20 blur-xl rounded-full group-hover:bg-[#458B73]/30 transition-all" />
            <div className="w-28 h-28 bg-[#252525] rounded-full border-2 border-[#458B73] flex items-center justify-center relative z-10 overflow-hidden">
              {user.image ? (
                <img src={user.image} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-bold text-white">{user.name?.charAt(0).toUpperCase() ?? "U"}</span>
              )}
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">{user.name}</h1>
        </div>

        {/* Main Content */}
        <div className="space-y-6">

          {/* Account Info */}
          <section className="bg-[#252525] rounded-3xl border border-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/5">
              <h2 className="font-bold text-white flex items-center gap-2">
                <span>👤</span> Informasi Akun
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Nama Lengkap</label>
                <div className="flex justify-between items-center group">
                  <span className="text-neutral-200 font-medium">{user.name}</span>
                  <button className="text-xs text-[#458B73] opacity-0 group-hover:opacity-100 transition-opacity hover:underline">Edit</button>
                </div>
              </div>
              <div className="h-px bg-white/5" />

              {/* Email with Masking */}
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Email</label>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-200 font-medium font-mono">
                    {showEmail ? user.email : maskEmail(user.email)}
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsEmailChangeOpen(true)}
                      className="text-xs text-[#458B73] hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setShowEmail(!showEmail)}
                      className="text-neutral-500 hover:text-white transition-colors"
                    >
                      {showEmail ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.454 10.454 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="h-px bg-white/5" />

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Google Account</label>
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-neutral-200 font-medium">{googleLinked ? "Terhubung" : "Belum Terhubung"}</span>
                    {googleLinked && user.googleEmail && (
                      <span className="text-[10px] text-neutral-500 font-mono">{maskEmail(user.googleEmail)}</span>
                    )}
                  </div>
                  {googleLinked ? (
                    <button
                      onClick={handleUnlinkGoogle}
                      disabled={unlinkingGoogle}
                      className="text-xs text-red-500 hover:text-red-400 transition-colors disabled:opacity-50"
                    >
                      {unlinkingGoogle ? "Memutuskan..." : "Putuskan Sambungan"}
                    </button>
                  ) : (
                    <button onClick={() => signIn("google", { callbackUrl: "/account" })} className="text-xs text-[#458B73] hover:underline">Hubungkan Google</button>
                  )}
                </div>
              </div>

              <div className="h-px bg-white/5" />

              {/* Phone with Masking */}
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Nomor Telepon</label>
                <div className="flex justify-between items-center group">
                  <span className="text-neutral-200 font-medium font-mono">
                    {maskPhone(user.phone) || "-"}
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsPhoneChangeOpen(true)}
                      className="text-xs text-[#458B73] hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Security */}
          <section className="bg-[#252525] rounded-3xl border border-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/5">
              <h2 className="font-bold text-white flex items-center gap-2">
                <span>🔒</span> Keamanan
              </h2>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Password</p>
                  <p className="text-xs text-neutral-400">Password aktif</p>
                </div>
                <button
                  onClick={() => setIsChangePasswordOpen(true)}
                  className="px-4 py-2 text-xs font-bold bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors border border-white/5"
                >
                  Ubah Password
                </button>
              </div>
            </div>
          </section>

          {/* Preferences */}
          <section className="bg-[#252525] rounded-3xl border border-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/5">
              <h2 className="font-bold text-white flex items-center gap-2">
                <span>⚙️</span> Preferensi
              </h2>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Laporan Bulanan via WhatsApp</p>
                  <p className="text-xs text-neutral-400">Terima ringkasan keuangan via WhatsApp Bot</p>
                </div>
                <button
                  onClick={toggleOptIn}
                  className={`w-11 h-6 rounded-full relative transition-colors ${optIn ? 'bg-[#458B73]' : 'bg-neutral-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${optIn ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleSignOut}
              disabled={isLoading}
              className="w-full py-4 rounded-2xl bg-white/5 border border-white/5 text-white font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
            >
              <span>🚪</span> Keluar
            </button>
            <button
              onClick={handleDeleteAccount}
              className="w-full py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 font-bold hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
            >
              <span>🗑️</span> Hapus Akun
            </button>
          </div>

        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        email={user.email || ""}
        phone={user.phone}
      />

      {/* Email Change Modal */}
      <EmailChangeModal
        isOpen={isEmailChangeOpen}
        onClose={() => setIsEmailChangeOpen(false)}
        currentEmail={user.email || ""}
        phone={user.phone}
      />

      <PhoneChangeModal
        isOpen={isPhoneChangeOpen}
        onClose={() => setIsPhoneChangeOpen(false)}
        currentPhone={user.phone}
      />
    </div>
  );
}