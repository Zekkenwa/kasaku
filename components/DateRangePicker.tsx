"use client";

import { useState, useEffect } from "react";

type Props = {
    startDate: string;
    endDate: string;
    onApply: (start: string, end: string) => void;
};

export default function DateRangePicker({ startDate, endDate, onApply }: Props) {
    const [start, setStart] = useState(startDate);
    const [end, setEnd] = useState(endDate);

    // Sync state if props change (e.g. from URL)
    useEffect(() => {
        setStart(startDate);
        setEnd(endDate);
    }, [startDate, endDate]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onApply(start, end);
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 p-2 border rounded-lg bg-gray-50">
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Dari</label>
                <input
                    type="date"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className="px-2 py-1 text-sm border rounded"
                />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Sampai</label>
                <input
                    type="date"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className="px-2 py-1 text-sm border rounded"
                />
            </div>
            <button
                type="submit"
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
                Terapkan
            </button>
        </form>
    );
}
