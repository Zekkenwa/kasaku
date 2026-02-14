"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useState, useEffect } from "react";

export default function AccountMenu() {
  const [isOpen, setIsOpen] = useState(false);

  // Close when clicking outside (simple version)
  useEffect(() => {
    const close = () => setIsOpen(false);
    if (isOpen) window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [isOpen]);

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs md:text-sm px-2.5 py-1.5 md:px-3 md:py-2 border rounded-lg md:rounded-xl bg-[#252525] text-white border-white/10 hover:bg-[#333] transition-all flex items-center gap-1 md:gap-2 shadow-sm"
      >
        Akun {isOpen ? "▴" : "▾"}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="rounded-xl border border-white/5 bg-[#252525] shadow-xl overflow-hidden p-1">
            <Link
              href="/account"
              className="flex items-center justify-between px-3 py-2.5 text-xs md:text-sm hover:bg-white/5 text-neutral-300 hover:text-white rounded-lg transition-colors group"
            >
              <span>Pengaturan Akun</span>
              <span className="group-hover:rotate-45 transition-transform">⚙️</span>
            </Link>
            <div className="h-px bg-white/5 my-1" />
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center justify-between px-3 py-2.5 text-xs md:text-sm hover:bg-[#F26076]/10 text-[#F26076] rounded-lg transition-colors cursor-pointer font-medium"
            >
              <span>Keluar</span>
              <span>🚪</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}