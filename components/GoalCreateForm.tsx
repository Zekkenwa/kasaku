"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
    onClose: () => void;
};

export default function GoalCreateForm({ onClose }: Props) {
    const router = useRouter();
    const [name, setName] = useState("");
    const [targetAmount, setTargetAmount] = useState("");
    const [currentAmount, setCurrentAmount] = useState("");
    const [deadline, setDeadline] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !targetAmount) return;
        setLoading(true);
        try {
            const res = await fetch("/api/goals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    targetAmount: Number(targetAmount),
                    currentAmount: Number(currentAmount) || 0,
                    deadline: deadline || null,
                }),
            });
            if (res.ok) {
                router.refresh();
                onClose();
            } else {
                alert("Gagal membuat target");
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Target</label>
                <input
                    type="text"
                    placeholder="Contoh: Liburan Bali"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#458B73] focus:border-transparent"
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target (Rp)</label>
                <input
                    type="number"
                    placeholder="5000000"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#458B73] focus:border-transparent"
                    required
                    min="1"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Awal (Rp)</label>
                <input
                    type="number"
                    placeholder="0"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#458B73] focus:border-transparent"
                    min="0"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tenggat Waktu <span className="text-gray-400">(opsional)</span></label>
                <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#458B73] focus:border-transparent"
                />
            </div>
            <button
                type="submit"
                disabled={loading || !name || !targetAmount}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white cursor-pointer disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #458B73, #458B73dd)" }}
            >
                {loading ? "Menyimpan..." : "Buat Target"}
            </button>
        </form>
    );
}
