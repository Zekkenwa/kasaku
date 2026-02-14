
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function formatRupiah(amount: number) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

function formatDate(date?: Date | string) {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export default function ConflictResolverClient({ token, currentUser, googleUser, googleEmail }: any) {
    const router = useRouter();
    const [loading, setLoading] = useState<"KEEP_CURRENT" | "KEEP_GOOGLE" | null>(null);

    const resolve = async (choice: "KEEP_CURRENT" | "KEEP_GOOGLE") => {
        if (!confirm("Tindakan ini tidak dapat dibatalkan. Data akun yang tidak dipilih akan DIHAPUS. Lanjutkan?")) return;

        setLoading(choice);
        const res = await fetch("/api/account/google/merge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, choice }),
        });

        if (res.ok) {
            router.push("/account?success=Merged");
        } else {
            const data = await res.json();
            alert(data.error || "Gagal menggabungkan akun.");
            setLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="p-6 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800">
                    <h1 className="text-xl font-bold text-amber-800 dark:text-amber-200">Konflik Akun Terdeteksi ⚠️</h1>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        Akun Google <strong>{googleEmail}</strong> sudah terdaftar dengan data yang berbeda. Pilih salah satu data untuk dipertahankan. Data yang tidak dipilih akan <strong>dihapus permanen</strong>.
                    </p>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Current User Card */}
                        <div className={`p-4 rounded-xl border-2 ${loading === "KEEP_CURRENT" ? "border-[#458B73] bg-green-50 dark:bg-green-900/10" : "border-gray-200 dark:border-gray-700"}`}>
                            <div className="text-center mb-4">
                                <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-500">Akun Saat Ini</span>
                                <h3 className="font-bold text-lg mt-2 text-black dark:text-white">{currentUser.name || "User"}</h3>
                                <p className="text-xs text-gray-400">{currentUser.email}</p>
                            </div>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between border-b pb-2 border-dashed border-gray-200 dark:border-gray-700">
                                    <span className="text-gray-500">Total Saldo</span>
                                    <span className="font-bold text-black dark:text-gray-200">{formatRupiah(currentUser.totalBalance)}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2 border-dashed border-gray-200 dark:border-gray-700">
                                    <span className="text-gray-500">Jumlah Dompet</span>
                                    <span className="font-bold text-black dark:text-gray-200">{currentUser.walletCount}</span>
                                </div>
                                <div className="flex justify-between pb-2">
                                    <span className="text-gray-500">Transaksi Terakhir</span>
                                    <span className="font-bold text-black dark:text-gray-200">{formatDate(currentUser.lastTx)}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => resolve("KEEP_CURRENT")}
                                disabled={!!loading}
                                className="w-full mt-6 py-2.5 bg-[#458B73] hover:bg-[#346b58] text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                            >
                                {loading === "KEEP_CURRENT" ? "Menyimpan..." : "Pertahankan Akun Ini"}
                            </button>
                        </div>

                        {/* Google User Card */}
                        <div className={`p-4 rounded-xl border-2 ${loading === "KEEP_GOOGLE" ? "border-blue-500 bg-blue-50 dark:bg-blue-900/10" : "border-gray-200 dark:border-gray-700"}`}>
                            <div className="text-center mb-4">
                                <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded text-xs font-mono text-blue-600 dark:text-blue-300">Akun Google</span>
                                <h3 className="font-bold text-lg mt-2 text-black dark:text-white">{googleUser.name || "Google User"}</h3>
                                <p className="text-xs text-gray-400">{googleEmail}</p>
                            </div>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between border-b pb-2 border-dashed border-gray-200 dark:border-gray-700">
                                    <span className="text-gray-500">Total Saldo</span>
                                    <span className="font-bold text-black dark:text-gray-200">{formatRupiah(googleUser.totalBalance)}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2 border-dashed border-gray-200 dark:border-gray-700">
                                    <span className="text-gray-500">Jumlah Dompet</span>
                                    <span className="font-bold text-black dark:text-gray-200">{googleUser.walletCount}</span>
                                </div>
                                <div className="flex justify-between pb-2">
                                    <span className="text-gray-500">Transaksi Terakhir</span>
                                    <span className="font-bold text-black dark:text-gray-200">{formatDate(googleUser.lastTx)}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => resolve("KEEP_GOOGLE")}
                                disabled={!!loading}
                                className="w-full mt-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                            >
                                {loading === "KEEP_GOOGLE" ? "Beralih ke Google..." : "Gunakan Data Google"}
                            </button>
                        </div>
                    </div>
                    <div className="text-center mt-6">
                        <button onClick={() => router.push("/account")} className="text-gray-400 text-sm hover:text-gray-600">Batal / Kembali</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
