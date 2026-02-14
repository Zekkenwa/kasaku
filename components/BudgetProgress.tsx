"use client";

// Matches usage in DashboardClient
type Props = {
    id: string;
    categoryName: string;
    limit: number;
    spent: number;
    period?: string;
    onEdit: () => void;
    compact?: boolean;
};

export default function BudgetProgress({ categoryName, limit, spent, onEdit, compact }: Props) {
    const remaining = limit - spent;
    let percentage = Math.max(0, Math.min(100, Math.round((remaining / limit) * 100)));

    const isOver = spent > limit;

    let color = "#10B981";
    if (percentage < 20) color = "#EF4444";
    else if (percentage < 50) color = "#F59E0B";

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

    return (
        <div
            className={`${compact ? "p-2.5" : "p-4"} rounded-xl border hover:shadow-md cursor-pointer transition-all bg-black/20 hover:bg-white/5 group relative ${isOver ? "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]" : "border-white/5 hover:border-white/20"}`}
            onClick={onEdit}
        >
            <div className="flex justify-between items-center mb-1">
                <span className={`font-semibold ${compact ? "text-xs" : "text-sm"} text-white group-hover:text-[#458B73] transition-colors`}>{categoryName}</span>
                <span className={`text-xs font-bold py-0.5 px-2 rounded-full ${isOver ? "bg-[#F26076]/20 text-[#F26076]" : "bg-[#458B73]/20 text-[#458B73]"}`}>
                    {isOver ? "Over!" : `${percentage}%`}
                </span>
            </div>

            <div className={`w-full bg-white/5 rounded-full ${compact ? "h-2" : "h-2.5"} mb-1 overflow-hidden`}>
                <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                        width: `${percentage}%`,
                        backgroundColor: color,
                        boxShadow: `0 0 10px ${color}`
                    }}
                />
            </div>

            {!compact && (
                <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                    <span>Sisa: {formatCurrency(remaining)}</span>
                    <span>Limit: {formatCurrency(limit)}</span>
                </div>
            )}
        </div>
    );
}
