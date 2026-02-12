"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

export default function AccountMenu() {
  return (
    <div className="relative group">
      <button className="text-sm px-3 py-2 border rounded-lg">
        Akun
      </button>
      <div className="absolute right-0 top-full hidden group-hover:block w-48 pt-2 z-50">
        <div className="rounded-lg border bg-white shadow-md">
          <Link
            href="/account"
            className="block px-3 py-2 text-sm hover:bg-gray-50 rounded-t-lg"
          >
            Pengaturan Akun
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded-b-lg"
          >
            Keluar
          </button>
        </div>
      </div>
    </div>
  );
}