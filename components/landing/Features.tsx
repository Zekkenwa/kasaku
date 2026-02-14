export default function Features() {
    const features = [
        {
            title: "Pencatatan Secepat Kilat",
            desc: "Input transaksi hanya dalam hitungan detik. Kategori cerdas otomatis merapikan pengeluaranmu.",
            icon: "⚡",
            color: "text-brand-green",
            bg: "bg-brand-green/10",
        },
        {
            title: "Analisis Visual",
            desc: "Grafik donat dan garis yang cantik membantumu memahami kemana perginya uangmu setiap bulan.",
            icon: "📊",
            color: "text-brand-yellow",
            bg: "bg-brand-yellow/10",
        },
        {
            title: "Multi-Wallet",
            desc: "Kelola saldo tunai, rekening bank, dan e-wallet dalam satu dashboard terintegrasi.",
            icon: "💳",
            color: "text-brand-red",
            bg: "bg-brand-red/10",
        },
        {
            title: "Target Tabungan",
            desc: "Set goal impianmu (HP baru, Liburan, Rumah) dan pantau progresnya setiap hari.",
            icon: "🎯",
            color: "text-brand-red",
            bg: "bg-brand-red/10",
        },
        {
            title: "Export Laporan",
            desc: "Download laporan keuanganmu ke format CSV/Excel untuk analisis lebih lanjut.",
            icon: "📥",
            color: "text-purple-400",
            bg: "bg-purple-400/10",
        },
        {
            title: "Mode Gelap",
            desc: "Tampilan nyaman di mata dengan Dark Mode yang elegan, cocok untuk rekap malam hari.",
            icon: "🌙",
            color: "text-neutral-200",
            bg: "bg-neutral-700/30",
        },
    ];

    return (
        <section id="features" className="py-24 bg-brand-dark">
            <div className="container mx-auto px-4">
                <div className="text-center max-w-2xl mx-auto mb-16 animate-fade-in-up">
                    <span className="text-brand-orange font-bold text-sm tracking-widest uppercase mb-2 block">Fitur Unggulan</span>
                    <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">Semua yang Kamu Butuhkan</h2>
                    <p className="text-neutral-400 text-lg">
                        Kasaku didesain simpel namun powerful. Kami membuang fitur rumit yang tidak kamu butuhkan.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((f, i) => (
                        <div key={i} className="group p-8 rounded-3xl bg-[#252525] hover:bg-[#2a2a2a] border border-white/5 hover:border-white/10 hover:shadow-2xl transition-all duration-300 relative overflow-hidden">
                            {/* Hover Glow */}
                            <div className={`absolute top-0 right-0 w-32 h-32 ${f.bg} filter blur-3xl opacity-0 group-hover:opacity-50 transition-opacity duration-500 rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none`} />

                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-6 ${f.bg} ${f.color} group-hover:scale-110 transition-transform duration-300`}>
                                {f.icon}
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-white group-hover:text-brand-green transition-colors">{f.title}</h3>
                            <p className="text-neutral-400 leading-relaxed">
                                {f.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
