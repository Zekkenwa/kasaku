import Link from "next/link";

export default function Hero() {
    return (
        <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-brand-green/10 to-transparent pointer-events-none" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand-yellow/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-brand-red/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />

            <div className="container mx-auto px-4 text-center relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-green/10 text-brand-green text-sm font-medium mb-6 animate-fade-in-up">
                    <img src="/logo.png" alt="Kasaku" className="w-5 h-5 rounded" />
                    Aplikasi Keuangan No. 1 di Hatimu
                </div>

                <h1 className="text-3xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-neutral-900 dark:text-white mb-6 leading-tight animate-fade-in-up delay-100">
                    Kelola Uang <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-green to-teal-400 whitespace-nowrap">Jadi Mudah</span>.
                    <br />
                    Hidup Lebih <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-orange to-brand-red">Tenang</span>.
                </h1>

                <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up delay-200">
                    Kasaku membantu kamu mencatat pemasukan, mengatur budget, dan memantau pengeluaran harianmu tanpa ribet. Gratis dan aman.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-300">
                    <Link href="/login" className="px-8 py-3.5 rounded-xl bg-brand-green text-white font-bold text-lg hover:bg-brand-green/90 hover:scale-105 transition-all shadow-lg shadow-brand-green/20">
                        Mulai Sekarang — Gratis
                    </Link>
                    <Link href="#features" className="px-8 py-3.5 rounded-xl bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold text-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all">
                        Pelajari Lebih Lanjut
                    </Link>
                </div>
            </div>
        </section>
    );
}
