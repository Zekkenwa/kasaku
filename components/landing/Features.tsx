export default function Features() {
    const features = [
        {
            title: "Pencatatan Secepat Kilat",
            desc: "Input transaksi hanya dalam hitungan detik. Kategori cerdas otomatis merapikan pengeluaranmu.",
            icon: "⚡",
            color: "bg-brand-yellow",
        },
        {
            title: "Analisis Visual",
            desc: "Grafik donat dan garis yang cantik membantumu memahami kemana perginya uangmu setiap bulan.",
            icon: "📊",
            color: "bg-brand-green",
        },
        {
            title: "Multi-Wallet",
            desc: "Kelola saldo tunai, rekening bank, dan e-wallet dalam satu dashboard terintegrasi.",
            icon: "💳",
            color: "bg-blue-500",
        },
        {
            title: "Target Tabungan",
            desc: "Set goal impianmu (HP baru, Liburan, Rumah) dan pantau progresnya setiap hari.",
            icon: "🎯",
            color: "bg-brand-red",
        },
        {
            title: "Export Laporan",
            desc: "Download laporan keuanganmu ke format CSV/Excel untuk analisis lebih lanjut.",
            icon: "📥",
            color: "bg-purple-500",
        },
        {
            title: "Mode Gelap",
            desc: "Tampilan nyaman di mata dengan Dark Mode yang elegan, cocok untuk rekap malam hari.",
            icon: "🌙",
            color: "bg-gray-800",
        },
    ];

    return (
        <section id="features" className="py-24 bg-white dark:bg-neutral-900">
            <div className="container mx-auto px-4">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <span className="text-brand-green font-bold text-sm tracking-widest uppercase mb-2 block">Fitur Unggulan</span>
                    <h2 className="text-3xl md:text-5xl font-bold mb-6 text-neutral-900 dark:text-white">Semua yang Kamu Butuhkan</h2>
                    <p className="text-neutral-600 dark:text-neutral-400 text-lg">
                        Kasaku didesain simpel namun powerful. Kami membuang fitur rumit yang tidak kamu butuhkan.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((f, i) => (
                        <div key={i} className="group p-8 rounded-3xl bg-neutral-50 dark:bg-neutral-800 hover:bg-white dark:hover:bg-neutral-700 hover:shadow-xl transition-all duration-300 border border-transparent hover:border-neutral-100 dark:hover:border-neutral-600">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-md ${f.color} group-hover:scale-110 transition-transform duration-300`}>
                                {f.icon}
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-neutral-900 dark:text-white group-hover:text-brand-green transition-colors">{f.title}</h3>
                            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                {f.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
