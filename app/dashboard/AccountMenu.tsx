"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

export default function AccountMenu() {
  return (
    <div className="relative group">
      <button className="text-sm px-3 py-2 border rounded-lg">
        Akun
      </button>
      <div className="absolute right-0 mt-2 w-48 rounded-lg border bg-white shadow-md hidden group-hover:block">
        <Link
          href="/account"
          className="block px-3 py-2 text-sm hover:bg-gray-50"
        >
          Akun Setting
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
        >
          Logout
        </button>
      </div>
    </div>
  );
}