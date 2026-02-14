"use client";

// Matches usage in DashboardClient
type Props = {
    id: string;
    categoryName: string;
    limit: number;
    spent: number;
    period?: string;
    onEdit: () => void;
};

export default function BudgetProgress({ categoryName, limit, spent, onEdit }: Props) {
    const remaining = limit - spent;
    // visual percentage for the bar (0 to 100)
    // If overbudget, remaining is negative, so bar should be 0 or show negative state? 
    // User said "mengurang sampai habis" (shrink to empty). So max(0, %).
    let percentage = Math.max(0, Math.min(100, Math.round((remaining / limit) * 100)));

    const isOver = spent > limit;

    // Color logic
    let color = "#10B981"; // Green (safe)
    if (percentage < 20) color = "#EF4444"; // Red (critical)
    else if (percentage < 50) color = "#F59E0B"; // Yellow (warning)

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

    return (
        <div
            className={`p-4 rounded-xl border hover:shadow-md cursor-pointer transition-all bg-black/20 hover:bg-white/5 group relative ${isOver ? "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]" : "border-white/5 hover:border-white/20"}`}
            onClick={onEdit}
        >
            <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-sm text-white group-hover:text-[#458B73] transition-colors">{categoryName}</span>
                <span className={`text-xs font-bold ${isOver ? "text-[#F26076]" : "text-neutral-500"}`}>
                    {isOver ? "Overbudget!" : `${percentage}% Tersisa`}
                </span>
            </div>

            {/* Depleting budget bar */}
            <div className="w-full bg-white/5 rounded-full h-2 mb-2 overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                        width: `${percentage}%`,
                        backgroundColor: color,
                        boxShadow: `0 0 10px ${color}`
                    }}
                />
            </div>

            <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                <span>Sisa: {formatCurrency(remaining)}</span>
                <span>Limit: {formatCurrency(limit)}</span>
            </div>
        </div>
    );
}
