import Link from "next/link";

export default function DonationPage() {
    return (
        <main className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 transition-colors duration-300">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="h-32 bg-gradient-to-r from-[#458B73] to-[#34d399] relative">
                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-lg border-4 border-white dark:border-gray-800 font-extrabold text-3xl">
                        ☕
                    </div>
                </div>

                <div className="pt-12 pb-8 px-8 text-center">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Dukung Kasaku</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 leading-relaxed">
                        Kasaku dikembangkan sebagai proyek open source. Jika aplikasi ini membantu keuanganmu, kamu bisa mentraktir kami kopi untuk semangat ngoding fitur baru! 🚀
                    </p>

                    <div className="space-y-4">
                        <a
                            href="https://tako.id/Zekkenwa"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full py-3.5 px-6 bg-[#40C4FF] hover:bg-[#29b6f6] text-white font-bold rounded-xl shadow-md transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                        >
                            <span>🎁</span> Traktir di Tako (Zekkenwa)
                        </a>

                        <a
                            href="https://trakteer.id/zekkenwa"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full py-3.5 px-6 bg-[#CD0A28] hover:bg-[#b00922] text-white font-bold rounded-xl shadow-md transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                        >
                            <span>🧧</span> Traktir di Trakteer (Zekkenwa)
                        </a>

                        <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500 my-4">
                            <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
                            <span>atau scan QR (jika ada)</span>
                            <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
                        </div>

                        <Link
                            href="/dashboard"
                            className="block w-full py-3 px-6 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-colors"
                        >
                            Kembali ke Dashboard
                        </Link>
                    </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/30 py-4 px-8 text-center text-xs text-gray-400 dark:text-gray-500">
                    Terima kasih atas dukunganmu! ❤️
                </div>
            </div>
        </main>
    );
}
