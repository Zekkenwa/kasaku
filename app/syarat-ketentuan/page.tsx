export default function TermsConditionsPage() {
    return (
        <main className="min-h-screen bg-[#1E1E1E] text-white font-sans selection:bg-brand-green selection:text-white pb-20">
            {/* Background Decoration */}
            <div className="fixed top-0 left-0 w-full h-[500px] bg-brand-green/5 rounded-full blur-[150px] pointer-events-none" />

            <div className="max-w-3xl mx-auto px-6 py-12 relative z-10">
                {/* Header */}
                <div className="mb-12 text-center animate-fade-in-up">
                    <div className="inline-block p-3 rounded-2xl bg-white/5 border border-white/10 mb-6 shadow-xl">
                        <span className="text-4xl">📜</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Syarat & Ketentuan</h1>
                    <p className="text-neutral-400 text-sm">perjanjian penggunaan layanan <strong>Kasaku</strong></p>
                    <p className="text-neutral-500 text-xs mt-2 uppercase tracking-widest">Terakhir diperbarui: {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>

                <div className="space-y-8 text-base leading-relaxed text-neutral-300">
                    {/* 1. Pendahuluan */}
                    <section className="animate-fade-in-up delay-100">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-brand-green/20 text-brand-green flex items-center justify-center text-sm font-bold">1</span>
                            Pendahuluan
                        </h2>
                        <p>
                            Selamat datang di <strong>Kasaku</strong>. Dengan mengakses atau menggunakan aplikasi ini, Anda setuju untuk terikat dengan Syarat dan Ketentuan berikut. Hubungan kami dengan Anda didasarkan pada kepercayaan dan transparansi.
                        </p>
                    </section>

                    {/* 2. Pengumpulan Data */}
                    <section className="animate-fade-in-up delay-200">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-brand-yellow/20 text-brand-yellow flex items-center justify-center text-sm font-bold">2</span>
                            Data yang Kami Kumpulkan
                        </h2>
                        <p className="mb-4">
                            Agar Kasaku dapat berfungsi sebagai asisten keuangan pribadi Anda, kami mengumpulkan dan memproses data berikut yang Anda berikan secara sukarela:
                        </p>
                        <ul className="grid gap-3">
                            <li className="bg-[#252525] p-4 rounded-xl border border-white/5 flex gap-3">
                                <span className="text-lg">📱</span>
                                <div>
                                    <strong className="text-white block text-sm mb-1">Nomor Telepon</strong>
                                    <span className="text-xs text-neutral-400">Digunakan semata-mata untuk otentikasi (login) dan layanan bot WhatsApp.</span>
                                </div>
                            </li>
                            <li className="bg-[#252525] p-4 rounded-xl border border-white/5 flex gap-3">
                                <span className="text-lg">💰</span>
                                <div>
                                    <strong className="text-white block text-sm mb-1">Informasi Keuangan</strong>
                                    <span className="text-xs text-neutral-400">Data transaksi, dompet, budget, dan goals yang Anda inputkan.</span>
                                </div>
                            </li>
                        </ul>
                    </section>

                    {/* 3. Penggunaan Data */}
                    <section className="animate-fade-in-up delay-300">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-brand-orange/20 text-brand-orange flex items-center justify-center text-sm font-bold">3</span>
                            Penggunaan Data
                        </h2>
                        <p>
                            Data Anda hanya digunakan untuk satu tujuan: <strong>menyediakan layanan pencatatan dan analisis keuangan untuk Anda sendiri.</strong>
                        </p>
                    </section>

                    {/* 4. Privasi & Keamanan (Special Card) */}
                    <section className="animate-fade-in-up delay-500 my-10 relative group">
                        <div className="absolute inset-0 bg-brand-green/20 rounded-3xl blur-xl group-hover:bg-brand-green/30 transition-colors" />
                        <div className="relative bg-[#0F291E] p-8 rounded-3xl border border-brand-green/30 overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor" className="text-brand-green">
                                    <path fillRule="evenodd" d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 00.374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 00-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08zm3.094 8.016a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                                </svg>
                            </div>

                            <h2 className="text-xl font-bold text-brand-green mb-4 flex items-center gap-2">
                                <span className="text-2xl">🛡️</span> Privasi & Komitmen Kami
                            </h2>
                            <p className="font-medium text-white mb-4">
                                Privasi Anda adalah prioritas mutlak kami.
                            </p>
                            <ul className="space-y-3">
                                <li className="flex gap-3 items-start">
                                    <div className="w-5 h-5 rounded-full bg-brand-green flex items-center justify-center mt-0.5 shrink-0">
                                        <svg className="w-3 h-3 text-[#0F291E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    <span className="text-sm text-brand-green/90"><strong>Kami TIDAK memperjualbelikan data Anda</strong> kepada pihak ketiga, pengiklan, atau broker data manapun.</span>
                                </li>
                                <li className="flex gap-3 items-start">
                                    <div className="w-5 h-5 rounded-full bg-brand-green flex items-center justify-center mt-0.5 shrink-0">
                                        <svg className="w-3 h-3 text-[#0F291E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    <span className="text-sm text-brand-green/90">Data Anda tidak digunakan untuk profiling iklan.</span>
                                </li>
                                <li className="flex gap-3 items-start">
                                    <div className="w-5 h-5 rounded-full bg-brand-green flex items-center justify-center mt-0.5 shrink-0">
                                        <svg className="w-3 h-3 text-[#0F291E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    <span className="text-sm text-brand-green/90">Keamanan data Anda dilindungi dengan standar enkripsi industri.</span>
                                </li>
                            </ul>
                        </div>
                    </section>

                    {/* 5. Hak Pengguna */}
                    <section className="animate-fade-in-up delay-700">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-brand-red/20 text-brand-red flex items-center justify-center text-sm font-bold">5</span>
                            Hak Anda (Kontrol Penuh)
                        </h2>
                        <ul className="list-disc pl-5 space-y-2 text-neutral-400 marker:text-brand-red">
                            <li>Mengakses dan melihat seluruh riwayat transaksi Anda kapan saja.</li>
                            <li>Mengubah atau menghapus data transaksi tertentu.</li>
                            <li><strong>Menghapus Akun:</strong> Anda dapat meminta penghapusan akun serta seluruh data terkait secara permanen melalui menu Pengaturan di aplikasi.</li>
                        </ul>
                    </section>

                    <div className="pt-12 border-t border-white/10 text-center animate-fade-in-up delay-[800ms] pb-8">
                        <p className="text-neutral-500 text-sm mb-6">
                            Dengan melanjutkan, Anda menyetujui seluruh poin di atas.
                        </p>
                        <a href="/login" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-neutral-200 hover:scale-105 transition-all shadow-lg shadow-white/10">
                            <span>🤝</span> Saya Setuju & Kembali ke Login
                        </a>
                    </div>
                </div>
            </div>
        </main>
    );
}
