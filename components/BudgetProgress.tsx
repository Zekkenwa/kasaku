"use client";

import { useRouter } from "next/navigation";

type Props = {
    id: string;
    categoryName: string;
    spent: number;
    limit: number;
    period?: string;
    onEdit: () => void;
};

const currency = (value: number) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(value);

const PERIOD_LABELS: Record<string, string> = {
    MONTHLY: "Bulanan",
    WEEKLY: "Mingguan",
    DAILY: "Harian",
    YEARLY: "Tahunan",
    ONCE: "Sekali",
    MANUAL: "Manual",
};

export default function BudgetProgress({ id, categoryName, spent, limit, period, onEdit }: Props) {
    const router = useRouter();
    const percent = Math.min((spent / limit) * 100, 100);
    const isOverLimit = spent >= limit;

    let barColor = "#458B73";
    if (isOverLimit) barColor = "#F26076";
    else if (percent > 80) barColor = "#F26076";
    else if (percent > 50) barColor = "#FF9760";

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(`Hapus budget "${categoryName}"? Tindakan ini tidak bisa dibatalkan.`)) return;
        try {
            const res = await fetch(`/api/budgets/${id}`, { method: "DELETE" });
            if (res.ok) router.refresh();
            else alert("Gagal menghapus budget");
        } catch { alert("Terjadi kesalahan"); }
    };

    return (
        <div
            className="rounded-xl p-4 cursor-pointer hover:shadow-md transition-all relative"
            onClick={onEdit}
            style={{
                border: isOverLimit ? "2px solid #F26076" : "1px solid #f0f0f0",
                background: isOverLimit ? "rgba(242,96,118,0.03)" : "white",
            }}
        >
            {/* Delete button */}
            <button
                onClick={handleDelete}
                className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 cursor-pointer text-sm z-10"
                title="Hapus budget"
            >✕</button>

            <div className="flex justify-between items-center mb-2 pr-6">
                <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm" style={{ color: isOverLimit ? "#F26076" : "#374151" }}>
                        {categoryName}
                    </h4>
                    {period && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            {PERIOD_LABELS[period] || period}
                        </span>
                    )}
                </div>
                <span className="text-xs font-bold" style={{ color: isOverLimit ? "#F26076" : percent > 50 ? "#FF9760" : "#458B73" }}>
                    {Math.round(percent)}%
                </span>
            </div>

            <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percent}%`, background: barColor }}
                ></div>
            </div>

            <div className="flex justify-between text-xs">
                <span className="font-medium" style={{ color: isOverLimit ? "#F26076" : "#6b7280" }}>
                    {currency(spent)}
                </span>
                <span className="text-gray-400">Limit: {currency(limit)}</span>
            </div>
            {isOverLimit && (
                <p className="text-[10px] mt-1 font-medium" style={{ color: "#F26076" }}>
                    ⚠️ Melebihi batas budget!
                </p>
            )}
        </div>
    );
}
