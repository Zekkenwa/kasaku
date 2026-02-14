
export default function DashboardLoading() {
    const sideMargin = "clamp(1.25rem, 5vw, 8rem)";

    return (
        <main className="min-h-screen pb-20 bg-[#1a1a1a] transition-colors duration-300">
            {/* ===== HEADER SKELETON ===== */}
            <div className="pt-8 pb-14 rounded-b-[3rem] shadow-none relative bg-[#1a1a1a]" style={{ paddingLeft: sideMargin, paddingRight: sideMargin }}>
                <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 md:mb-10 gap-4 relative z-30 animate-pulse">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-[#252525]"></div>
                        <div>
                            <div className="h-3 w-24 bg-[#252525] rounded mb-2"></div>
                            <div className="h-6 w-40 bg-[#252525] rounded-lg"></div>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-[#252525]"></div>
                </header>

                {/* ===== HERO SKELETON (Balance + Wallets) ===== */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10 animate-pulse">
                    {/* Total Balance Card */}
                    <div className="col-span-1 p-8 rounded-3xl bg-[#252525] border border-white/5 h-[180px] flex flex-col justify-between">
                        <div className="h-4 w-32 bg-[#333] rounded"></div>
                        <div className="h-10 w-48 bg-[#333] rounded-lg"></div>
                        <div className="flex gap-4">
                            <div className="h-8 w-24 bg-[#333] rounded-lg"></div>
                            <div className="h-8 w-24 bg-[#333] rounded-lg"></div>
                        </div>
                    </div>
                    {/* Wallets Placeholder */}
                    <div className="col-span-1 md:col-span-2 flex gap-4 overflow-hidden">
                        <div className="w-64 h-[180px] rounded-3xl bg-[#252525] border border-white/5 flex-shrink-0"></div>
                        <div className="w-64 h-[180px] rounded-3xl bg-[#252525] border border-white/5 flex-shrink-0"></div>
                        <div className="w-64 h-[180px] rounded-3xl bg-[#252525] border border-white/5 flex-shrink-0"></div>
                    </div>
                </section>
            </div>

            {/* ===== MAIN CONTENT SKELETON ===== */}
            <div className="py-8 animate-pulse" style={{ paddingLeft: sideMargin, paddingRight: sideMargin }}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    {/* LEFT COLUMN: Transaction History (2 cols wide) */}
                    <div className="col-span-1 md:col-span-2 bg-[#252525] rounded-3xl border border-white/5 p-6 min-h-[500px]">
                        <div className="flex justify-between items-center mb-8">
                            <div className="h-6 w-48 bg-[#333] rounded"></div>
                            <div className="flex gap-2">
                                <div className="h-8 w-24 bg-[#333] rounded-lg"></div>
                                <div className="h-8 w-32 bg-[#333] rounded-lg"></div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-black/20 border border-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-[#333]"></div>
                                        <div>
                                            <div className="h-4 w-32 bg-[#333] rounded mb-2"></div>
                                            <div className="h-3 w-20 bg-[#333] rounded"></div>
                                        </div>
                                    </div>
                                    <div className="h-5 w-24 bg-[#333] rounded"></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Analytics & Tools (1 col wide) */}
                    <div className="col-span-1 flex flex-col gap-6">
                        {/* Expense Pie */}
                        <div className="h-[420px] bg-[#252525] rounded-3xl border border-white/5 p-6 flex flex-col items-center justify-center">
                            <div className="w-40 h-40 rounded-full bg-[#333] mb-6"></div>
                            <div className="w-full space-y-3">
                                <div className="h-4 w-full bg-[#333] rounded"></div>
                                <div className="h-4 w-3/4 bg-[#333] rounded"></div>
                                <div className="h-4 w-5/6 bg-[#333] rounded"></div>
                            </div>
                        </div>
                        {/* Income Pie */}
                        <div className="h-[420px] bg-[#252525] rounded-3xl border border-white/5 p-6 flex flex-col items-center justify-center">
                            <div className="w-40 h-40 rounded-full bg-[#333] mb-6"></div>
                            <div className="w-full space-y-3">
                                <div className="h-4 w-full bg-[#333] rounded"></div>
                                <div className="h-4 w-3/4 bg-[#333] rounded"></div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </main>
    );
}
