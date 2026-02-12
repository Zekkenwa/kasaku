"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

type UserData = {
  name: string | null;
  email: string | null;
  phone: string | null;
  monthlyReportOptIn: boolean;
  deleteRequestedAt: Date | null;
  deleteScheduledAt: Date | null;
};

export default function AccountSettingsClient({ user }: { user: UserData }) {
  const [name, setName] = useState(user.name ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [monthlyReportOptIn, setMonthlyReportOptIn] = useState(
    user.monthlyReportOptIn
  );
  const [status, setStatus] = useState<string | null>(null);
  const [deleteInfo, setDeleteInfo] = useState<Date | null>(
    user.deleteScheduledAt ? new Date(user.deleteScheduledAt) : null
  );

  const save = async () => {
    setStatus("Menyimpan...");
    const res = await fetch("/api/account/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, monthlyReportOptIn }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setStatus(data.error ?? "Gagal menyimpan");
      return;
    }
    setStatus("Tersimpan");
  };

  const requestDelete = async () => {
    const ok = confirm(
      "Yakin request hapus akun? Anda akan otomatis logout.\n\nLogin kembali untuk membatalkan penghapusan."
    );
    if (!ok) return;

    const res = await fetch("/api/account/request-delete", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      await signOut({ callbackUrl: "/" });
    }
  };

  return (
    <main className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold">Akun Setting</h1>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-600">Nama</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">Email</label>
          <input
            className="w-full border rounded px-3 py-2 bg-gray-50"
            value={user.email ?? ""}
            disabled
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">Nomor (format 62xxxx)</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\s+/g, ""))}
            placeholder="628123456789"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={monthlyReportOptIn}
            onChange={(e) => setMonthlyReportOptIn(e.target.checked)}
          />
          Opt-in laporan keuangan bulanan via email
        </label>

        <button
          onClick={save}
          className="px-4 py-2 border rounded-lg"
        >
          Simpan
        </button>
        {status && <p className="text-sm text-gray-500">{status}</p>}
      </div>

      <div className="border-t pt-4 space-y-2">
        <a
          href="/api/account/report"
          className="text-sm underline"
        >
          Download laporan seumur akun
        </a>

        <div>
          <button
            onClick={requestDelete}
            className="text-sm text-red-600"
          >
            Hapus akun
          </button>
        </div>

        {deleteInfo && (
          <p className="text-xs text-red-600">
            Akun akan dihapus permanen pada:{" "}
            {deleteInfo.toLocaleString("id-ID")}
          </p>
        )}
      </div>
    </main>
  );
}