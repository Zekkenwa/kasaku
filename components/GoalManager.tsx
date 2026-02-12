"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Goal = {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    deadline?: string;
    notes?: string;
};

type Props = {
    initialGoals?: Goal[];
};

export default function GoalManager({ initialGoals = [] }: Props) {
    const router = useRouter();
    const [goals, setGoals] = useState<Goal[]>(initialGoals);
    const [loading, setLoading] = useState(initialGoals.length === 0);
    const [isAdding, setIsAdding] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [targetAmount, setTargetAmount] = useState("");
    const [currentAmount, setCurrentAmount] = useState("");
    const [deadline, setDeadline] = useState("");
    const [notes, setNotes] = useState("");

    const fetchGoals = async () => {
        try {
            const res = await fetch("/api/goals");
            if (res.ok) {
                setGoals(await res.json());
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (initialGoals.length === 0) {
            fetchGoals();
        } else {
            setLoading(false);
        }
    }, [initialGoals]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch("/api/goals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    targetAmount: Number(targetAmount),
                    currentAmount: Number(currentAmount),
                    deadline: deadline || null,
                    notes,
                }),
            });

            if (res.ok) {
                setIsAdding(false);
                fetchGoals();
                setName("");
                setTargetAmount("");
                setCurrentAmount("");
                setDeadline("");
                setNotes("");
                router.refresh();
            }
        } catch (e) {
            alert("Gagal menyimpan goal");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus goal ini?")) return;
        try {
            await fetch(`/api/goals/${id}`, { method: "DELETE" });
            setGoals(goals.filter((g) => g.id !== id));
            router.refresh();
        } catch (e) {
            alert("Gagal menghapus");
        }
    };

    const handleUpdateAmount = async (id: string, current: number, add: number) => {
        const newAmount = current + add;
        try {
            // Optimistic update
            setGoals(goals.map(g => g.id === id ? { ...g, currentAmount: newAmount } : g));

            await fetch(`/api/goals/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentAmount: newAmount }),
            });
            router.refresh();
        } catch (e) {
            fetchGoals(); // Revert on error
        }
    };

    const currency = (val: number) =>
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Target Tabungan 🎯</h2>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800"
                >
                    {isAdding ? "Batal" : "+ Buat Target"}
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-xl border space-y-3">
                    <div>
                        <label className="block text-sm font-medium">Nama Target</label>
                        <input
                            required
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full border p-2 rounded"
                            placeholder="Contoh: Beli Laptop Baru"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Target (Rp)</label>
                            <input
                                required
                                type="number"
                                value={targetAmount}
                                onChange={(e) => setTargetAmount(e.target.value)}
                                className="w-full border p-2 rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Sudah Terkumpul (Awal)</label>
                            <input
                                type="number"
                                value={currentAmount}
                                onChange={(e) => setCurrentAmount(e.target.value)}
                                className="w-full border p-2 rounded"
                                placeholder="0"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Tenggat Waktu (Opsional)</label>
                        <input
                            type="date"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            className="w-full border p-2 rounded"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                    >
                        {loading ? "Menyimpan..." : "Simpan Target"}
                    </button>
                </form>
            )}

            {loading && goals.length === 0 ? (
                <p>Loading...</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {goals.map((goal) => {
                        const percentage = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                        return (
                            <div key={goal.id} className="border p-4 rounded-xl shadow-sm bg-white relative">
                                <button
                                    onClick={() => handleDelete(goal.id)}
                                    className="absolute top-4 right-4 text-gray-400 hover:text-red-500"
                                >
                                    ✕
                                </button>
                                <h3 className="font-semibold text-lg">{goal.name}</h3>
                                <p className="text-gray-500 text-xs mb-3">
                                    Deadline: {goal.deadline ? new Date(goal.deadline).toLocaleDateString("id-ID") : "Tidak ada"}
                                </p>

                                <div className="mb-2 flex justify-between text-sm">
                                    <span>{currency(goal.currentAmount)}</span>
                                    <span className="text-gray-500">Target: {currency(goal.targetAmount)}</span>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                                    <div
                                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                                        style={{ width: `${percentage}%` }}
                                    ></div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleUpdateAmount(goal.id, goal.currentAmount, 50000)}
                                        className="flex-1 py-1 text-xs border rounded hover:bg-green-50 text-green-700 border-green-200"
                                    >
                                        + 50rb
                                    </button>
                                    <button
                                        onClick={() => handleUpdateAmount(goal.id, goal.currentAmount, 100000)}
                                        className="flex-1 py-1 text-xs border rounded hover:bg-green-50 text-green-700 border-green-200"
                                    >
                                        + 100rb
                                    </button>
                                    <button
                                        onClick={() => {
                                            const amount = prompt("Masukkan jumlah (bisa negatif untuk kurangi):");
                                            if (amount) handleUpdateAmount(goal.id, goal.currentAmount, Number(amount));
                                        }}
                                        className="flex-1 py-1 text-xs border rounded hover:bg-gray-50"
                                    >
                                        Input
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {goals.length === 0 && !loading && !isAdding && (
                        <div className="col-span-full text-center text-gray-500 py-8 border border-dashed rounded-xl">
                            Belum ada target tabungan. Ayo buat satu! 🚀
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
