import Link from "next/link";

export default function Hero() {
    return (
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden bg-brand-dark">
            {/* Background Decoration (Dark Mode) */}
            {/* Top Center Glow (Teal/Green - Trust) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[500px] bg-brand-green/20 rounded-full blur-[120px] pointer-events-none opacity-50" />

            {/* Bottom Right Glow (Pink/Red - Energy) */}
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-brand-red/10 rounded-full blur-[100px] translate-y-1/2 translate-x-1/3 pointer-events-none" />

            <div className="container mx-auto px-4 text-center relative z-10">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-brand-green text-sm font-medium mb-8 animate-fade-in-up backdrop-blur-sm">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-green"></span>
                    </span>
                    Aplikasi Keuangan No. 1 di Hatimu
                </div>

                {/* Headline */}
                <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-8 leading-tight animate-fade-in-up delay-100 drop-shadow-2xl">
                    Kelola Uang <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-green to-teal-300 whitespace-nowrap">Jadi Mudah</span>.
                    <br />
                    Hidup Lebih <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-orange to-brand-red">Tenang</span>.
                </h1>

                {/* Subheadline */}
                <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-in-up delay-200">
                    Kasaku membantu kamu mencatat pemasukan, mengatur budget, dan memantau pengeluaran harianmu dengan tampilan yang modern dan nyaman di mata.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-300">
                    <Link href="/register" className="group relative px-8 py-4 rounded-full bg-gradient-to-r from-brand-red to-brand-orange text-white font-bold text-lg shadow-[0_0_20px_rgba(242,96,118,0.3)] hover:shadow-[0_0_30px_rgba(242,96,118,0.5)] hover:scale-105 transition-all overflow-hidden">
                        <span className="relative z-10">Mulai Sekarang — Gratis</span>
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    </Link>
                    <Link href="#features" className="px-8 py-4 rounded-full bg-white/5 text-white font-bold text-lg border border-white/10 hover:bg-white/10 transition-all backdrop-blur-sm">
                        Pelajari Lebih Lanjut
                    </Link>
                </div>
            </div>
        </section>
    );
}
