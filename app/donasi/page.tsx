import Link from "next/link";

export default function DonationPage() {
    return (
        <main className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Accents */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#458B73]/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#F26076]/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-md w-full bg-[#252525] rounded-3xl shadow-2xl border border-white/5 overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-500">
                {/* Header Icon */}
                <div className="pt-12 pb-6 flex justify-center relative">
                    <div className="relative">
                        <div className="absolute inset-0 bg-white/10 blur-xl rounded-full" />
                        <div className="w-24 h-24 bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] rounded-full flex items-center justify-center shadow-lg border border-white/5 relative z-10">
                            <span className="text-4xl">☕</span>
                        </div>
                    </div>
                </div>

                <div className="px-8 pb-10 text-center">
                    <h1 className="text-2xl font-bold text-white mb-3">Dukung Kasaku</h1>
                    <p className="text-neutral-400 text-sm mb-8 leading-relaxed">
                        Kasaku dikembangkan sebagai proyek <span className="text-white font-medium">open source</span>. Jika aplikasi ini membantu keuanganmu, kamu bisa mentraktir kami kopi untuk semangat ngoding fitur baru! 🚀
                    </p>

                    <div className="space-y-4">
                        <a
                            href="https://tako.id/Zekkenwa"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group block w-full py-4 px-6 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-cyan-500/20 transform hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                        >
                            <span className="text-xl">🎁</span>
                            <span>Traktir di Tako</span>
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                        </a>

                        <a
                            href="https://trakteer.id/zekkenwa"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group block w-full py-4 px-6 bg-gradient-to-r from-red-500 to-rose-500 text-white font-bold rounded-2xl shadow-lg shadow-rose-500/20 transform hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                        >
                            <span className="text-xl">🧧</span>
                            <span>Traktir di Trakteer</span>
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                        </a>

                        <div className="flex items-center gap-3 text-xs text-neutral-600 my-6">
                            <div className="h-px bg-white/5 flex-1"></div>
                            <span className="uppercase tracking-widest font-semibold">Atau</span>
                            <div className="h-px bg-white/5 flex-1"></div>
                        </div>

                        <Link
                            href="/dashboard"
                            className="block w-full py-3 px-6 bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white font-medium rounded-xl transition-all border border-transparent hover:border-white/5"
                        >
                            Kembali ke Dashboard
                        </Link>
                    </div>
                </div>

                <div className="bg-[#1f1f1f] py-4 px-8 text-center border-t border-white/5">
                    <p className="text-xs text-neutral-500 flex items-center justify-center gap-2">
                        Dibuat dengan <span className="text-[#F26076]">❤️</span> oleh Zekkenwa
                    </p>
                </div>
            </div>
        </main>
    );
}
