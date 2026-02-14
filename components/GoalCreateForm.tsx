"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
    onClose: () => void;
};

export default function GoalCreateForm({ onClose, initialData }: { onClose: () => void; initialData?: any }) {
    const router = useRouter();
    const [name, setName] = useState(initialData?.name || "");
    const [targetAmount, setTargetAmount] = useState(initialData?.targetAmount || "");
    const [currentAmount, setCurrentAmount] = useState(initialData?.currentAmount || "");
    const [hasDeadline, setHasDeadline] = useState(!!initialData?.deadline);
    const [deadline, setDeadline] = useState(
        initialData?.deadline ? new Date(initialData.deadline).toISOString().split('T')[0] : ""
    );
    const [loading, setLoading] = useState(false);

    const minDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !targetAmount) return;
        setLoading(true);

        const url = initialData ? `/api/goals/${initialData.id}` : "/api/goals";
        const method = initialData ? "PUT" : "POST";

        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    targetAmount: Number(targetAmount),
                    currentAmount: Number(currentAmount) || 0,
                    deadline: hasDeadline ? deadline : null,
                }),
            });
            if (res.ok) {
                router.refresh();
                onClose();
            } else {
                alert("Gagal menyimpan target");
            }
        } catch {
            alert("Terjadi kesalahan");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-white dark:text-gray-300 mb-1">Nama Target</label>
                <input
                    type="text"
                    placeholder="Contoh: Liburan Bali"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#458B73] focus:border-transparent dark:bg-gray-700 dark:text-white"
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-white dark:text-gray-300 mb-1">Target (Rp)</label>
                <input
                    type="number"
                    placeholder="5000000"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#458B73] focus:border-transparent dark:bg-gray-700 dark:text-white"
                    required
                    min="1"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-white dark:text-gray-300 mb-1">Awal (Rp)</label>
                <input
                    type="number"
                    placeholder="0"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#458B73] focus:border-transparent dark:bg-gray-700 dark:text-white"
                    min="0"
                />
            </div>
            <div>
                <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-white dark:text-gray-300">Tenggat Waktu</label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={hasDeadline}
                            onChange={(e) => setHasDeadline(e.target.checked)}
                            className="accent-[#458B73]"
                        />
                        <span className="text-xs text-gray-700 dark:text-gray-400">Ada tenggat</span>
                    </label>
                </div>
                {hasDeadline ? (
                    <input
                        type="date"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        min={minDate}
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#458B73] focus:border-transparent dark:bg-gray-700 dark:text-white"
                        style={{ colorScheme: "light dark" }}
                        required={hasDeadline}
                    />
                ) : (
                    <p className="text-xs text-gray-600 dark:text-white italic mt-1">Tanpa tenggat waktu</p>
                )}
            </div>
            <button
                type="submit"
                disabled={loading || !name || !targetAmount}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white cursor-pointer disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #458B73, #458B73dd)" }}
            >
                {loading ? "Menyimpan..." : (initialData ? "Simpan Perubahan" : "Buat Target")}
            </button>
        </form>
    );
}
