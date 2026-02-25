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
    const [isHovered, setIsHovered] = useState(false);
    const [warningVisible, setWarningVisible] = useState(false);

    useEffect(() => {
        if (isShaking) {
            const timer = setTimeout(() => setIsShaking(false), 500);
            return () => clearTimeout(timer);
        }
    }, [isShaking]);

    const maxDate = new Date().toISOString().split('T')[0];
    const isInvalid = Boolean(firstTxDate && start && start < firstTxDate);

    // Automatically show the warning when an invalid date is selected
    useEffect(() => {
        if (isInvalid) {
            setWarningVisible(true);
        } else {
            setWarningVisible(false);
        }
    }, [isInvalid, start]);

    // Disappear the warning after 5 seconds if not hovered over
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (warningVisible && !isHovered) {
            timer = setTimeout(() => {
                setWarningVisible(false);
            }, 5000);
        }
        return () => clearTimeout(timer);
    }, [warningVisible, isHovered]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isInvalid) {
            setWarningVisible(true);
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
                        className={`px-2 py-1 text-sm border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white ${isInvalid ? 'ring-2 ring-amber-500/50 outline-none' : ''}`}
                        style={{ colorScheme: "light dark" }}
                    />
                    {warningVisible && (
                        <div
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                            className={`absolute left-0 bottom-full mb-2 w-max max-w-xs z-[9999] text-[10px] leading-tight text-amber-700 bg-amber-50 dark:bg-black/90 dark:text-amber-400 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900 shadow-xl ${isShaking ? "shake" : ""}`}>
                            Mohon input tanggal mulai dari <b>{new Date(firstTxDate!).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}</b><br />
                            (Tanggal pertama transaksi)
                            {/* Tooltip Arrow */}
                            <div className="absolute top-full left-4 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-transparent border-t-amber-200/50 dark:border-t-amber-900/50"></div>
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
                    className={`px-3 py-1.5 text-sm rounded transition-colors ${isInvalid ? "bg-gray-400 text-gray-200 cursor-not-allowed" : "bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600"}`}
                >
                    Terapkan
                </button>
            </div>
        </form>
    );
}
