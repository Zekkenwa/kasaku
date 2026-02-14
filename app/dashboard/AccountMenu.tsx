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
        className="text-xs md:text-sm px-2.5 py-1.5 md:px-3 md:py-2 border rounded-lg md:rounded-xl bg-white/20 text-white border-white/30 backdrop-blur-sm hover:bg-white/30 transition-all flex items-center gap-1 md:gap-2"
      >
        Akun {isOpen ? "▴" : "▾"}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-40 z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="rounded-lg border bg-white dark:bg-gray-800 card-fix dark:border-gray-700 shadow-xl overflow-hidden">
            <Link
              href="/account"
              className="block px-3 py-2.5 text-xs md:text-sm text-right hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border-b border-gray-100 dark:border-gray-700 transition-colors"
            >
              Pengaturan Akun ⚙️
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full text-right px-3 py-2.5 text-xs md:text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors cursor-pointer font-medium"
            >
              Keluar 🚪
            </button>
          </div>
        </div>
      )}
    </div>
  );
}