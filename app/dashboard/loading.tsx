
export default function DashboardLoading() {
    const sideMargin = "clamp(1.25rem, 5vw, 8rem)";

    return (
        <main className="min-h-screen pb-20 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            {/* ===== HEADER SKELETON ===== */}
            <div className="pt-8 pb-14 rounded-b-3xl shadow-sm relative bg-white dark:bg-gray-800 transition-colors duration-300" style={{ paddingLeft: sideMargin, paddingRight: sideMargin }}>
                <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 md:mb-10 gap-4 relative z-30 animate-pulse">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700"></div>
                        <div>
                            <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
                            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </div>
                    </div>
                    <div className="flex gap-2 items-center w-full md:w-auto">
                        <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                        <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                        <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                        <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                    </div>
                </header>

                {/* ===== SALDO + SUMMARY SKELETON ===== */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 animate-pulse">
                    {/* Saldo Left */}
                    <div className="p-7 rounded-2xl bg-gray-200 dark:bg-gray-700/50 h-48"></div>
                    {/* Summary Right */}
                    <div className="flex flex-col gap-6">
                        <div className="p-6 rounded-2xl bg-gray-200 dark:bg-gray-700/50 h-20"></div>
                        <div className="p-6 rounded-2xl bg-gray-200 dark:bg-gray-700/50 h-20"></div>
                    </div>
                </section>
            </div>

            {/* ===== MAIN CONTENT SKELETON ===== */}
            <div className="py-8 space-y-8 md:py-16 md:space-y-16 animate-pulse" style={{ paddingLeft: sideMargin, paddingRight: sideMargin }}>

                {/* Recurring */}
                <div className="h-32 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700"></div>

                {/* Filter */}
                <div className="h-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700"></div>

                {/* Budget & Target */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                    <div className="h-64 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700"></div>
                    <div className="h-64 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700"></div>
                </div>

                {/* Charts & History */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-16">
                    <div className="lg:col-span-2 flex flex-col gap-8">
                        <div className="h-48 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700"></div>
                        <div className="h-48 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700"></div>
                    </div>
                    <div className="lg:col-span-3 h-[400px] bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700"></div>
                </div>
            </div>
        </main>
    );
}
