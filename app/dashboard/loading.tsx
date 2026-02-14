
export default function DashboardLoading() {
    const sideMargin = "clamp(1.25rem, 5vw, 8rem)";

    return (
        <main className="min-h-screen pb-20 bg-neutral-900 text-white">
            {/* ===== HEADER SKELETON ===== */}
            <div className="pt-8 pb-14 rounded-b-3xl shadow-sm relative bg-neutral-800" style={{ paddingLeft: sideMargin, paddingRight: sideMargin }}>
                <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 md:mb-10 gap-4 relative z-30 animate-pulse">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-neutral-700"></div>
                        <div>
                            <div className="h-3 w-24 bg-neutral-700 rounded mb-1"></div>
                            <div className="h-6 w-32 bg-neutral-700 rounded"></div>
                        </div>
                    </div>
                    <div className="flex gap-2 items-center w-full md:w-auto">
                        <div className="h-8 w-20 bg-neutral-700 rounded-lg"></div>
                        <div className="h-8 w-20 bg-neutral-700 rounded-lg"></div>
                        <div className="h-8 w-20 bg-neutral-700 rounded-lg"></div>
                        <div className="h-10 w-10 rounded-full bg-neutral-700"></div>
                    </div>
                </header>

                {/* ===== SALDO + SUMMARY SKELETON ===== */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 animate-pulse">
                    {/* Saldo Left */}
                    <div className="p-7 rounded-2xl bg-neutral-700/50 h-48"></div>
                    {/* Summary Right */}
                    <div className="flex flex-col gap-6">
                        <div className="p-6 rounded-2xl bg-neutral-700/50 h-20"></div>
                        <div className="p-6 rounded-2xl bg-neutral-700/50 h-20"></div>
                    </div>
                </section>
            </div>

            {/* ===== MAIN CONTENT SKELETON ===== */}
            <div className="py-8 space-y-8 md:py-16 md:space-y-16 animate-pulse" style={{ paddingLeft: sideMargin, paddingRight: sideMargin }}>

                {/* Recurring */}
                <div className="h-32 bg-neutral-800 rounded-2xl"></div>

                {/* Filter */}
                <div className="h-16 bg-neutral-800 rounded-2xl"></div>

                {/* Budget & Target */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                    <div className="h-64 bg-neutral-800 rounded-2xl"></div>
                    <div className="h-64 bg-neutral-800 rounded-2xl"></div>
                </div>

                {/* Charts & History */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-16">
                    <div className="lg:col-span-2 flex flex-col gap-8">
                        <div className="h-48 bg-neutral-800 rounded-2xl"></div>
                        <div className="h-48 bg-neutral-800 rounded-2xl"></div>
                    </div>
                    <div className="lg:col-span-3 h-[400px] bg-neutral-800 rounded-2xl"></div>
                </div>
            </div>
        </main>
    );
}
