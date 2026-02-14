"use client";

import { useState, useEffect } from "react";

type Props = {
    startDate: string;
    endDate: string;
    firstTxDate?: string | null;
    onApply: (start: string, end: string) => void;
};

export default function DateRangePicker({ startDate, endDate, firstTxDate, onApply }: Props) {
    const [start, setStart] = useState(startDate);
    const [end, setEnd] = useState(endDate);

    // Sync state if props change (e.g. from URL)
    useEffect(() => {
        setStart(startDate);
        setEnd(endDate);
    }, [startDate, endDate]);

    const [isShaking, setIsShaking] = useState(false);

    useEffect(() => {
        if (isShaking) {
            const timer = setTimeout(() => setIsShaking(false), 500);
            return () => clearTimeout(timer);
        }
    }, [isShaking]);

    const maxDate = new Date().toISOString().split('T')[0];
    const showWarning = firstTxDate && start && start < firstTxDate;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (showWarning) {
            setIsShaking(true);
            return;
        }
        onApply(start, end);
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .shake { animation: shake 0.3s ease-in-out; }
            `}</style>
            <div className="flex flex-wrap items-end gap-2">
                <div className="relative">
                    <label className="block text-xs font-medium text-white dark:text-gray-300 mb-1">Dari</label>
                    <input
                        type="date"
                        value={start}
                        max={maxDate}
                        onChange={(e) => setStart(e.target.value)}
                        className="px-2 py-1 text-sm border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        style={{ colorScheme: "light dark" }}
                    />
                    {showWarning && (
                        <div className={`absolute top-full left-0 w-full mt-1 z-10 text-[10px] leading-tight text-amber-700 bg-amber-50 dark:bg-amber-900/50 dark:text-amber-200 p-2 rounded-md border border-amber-200 dark:border-amber-800 shadow-sm ${isShaking ? "shake" : ""}`}>
                            Data baru tersedia mulai <b>{new Date(firstTxDate).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}</b>.
                        </div>
                    )}
                </div>
                <div>
                    <label className="block text-xs font-medium text-white dark:text-gray-300 mb-1">Sampai</label>
                    <input
                        type="date"
                        value={end}
                        max={maxDate}
                        onChange={(e) => setEnd(e.target.value)}
                        className="px-2 py-1 text-sm border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        style={{ colorScheme: "light dark" }}
                    />
                </div>
                <button
                    type="submit"
                    className={`px-3 py-1.5 text-sm rounded transition-colors ${showWarning ? "bg-gray-400 text-gray-200 cursor-not-allowed" : "bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600"}`}
                >
                    Terapkan
                </button>
            </div>
        </form>
    );
}
