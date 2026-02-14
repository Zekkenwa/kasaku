export default function TermsConditionsPage() {
    return (
        <main className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 transition-colors duration-300">
            <div className="max-w-4xl mx-auto px-6 py-12">
                {/* Header */}
                <div className="mb-10 text-center">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Syarat & Ketentuan</h1>
                    <p className="text-gray-500 dark:text-gray-400">Terakhir diperbarui: {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>

                <div className="space-y-8 text-base leading-relaxed">
                    {/* 1. Pendahuluan */}
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">1. Pendahuluan</h2>
                        <p>
                            Selamat datang di <strong>Kasaku</strong>. Dengan mengakses atau menggunakan aplikasi ini, Anda setuju untuk terikat dengan Syarat dan Ketentuan berikut. Hubungan kami dengan Anda didasarkan pada kepercayaan dan transparansi.
                        </p>
                    </section>

                    {/* 2. Pengumpulan Data */}
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">2. Data yang Kami Kumpulkan</h2>
                        <p className="mb-2">
                            Agar Kasaku dapat berfungsi sebagai asisten keuangan pribadi Anda, kami mengumpulkan dan memproses data berikut yang Anda berikan secara sukarela:
                        </p>
                        <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                            <li><strong>Nomor Telepon:</strong> Digunakan semata-mata untuk otentikasi (login) dan layanan bot WhatsApp.</li>
                            <li><strong>Informasi Keuangan:</strong> Data transaksi (pemasukan/pengeluaran), daftar dompet, hutang/piutang, budget, dan celengan (goals) yang Anda inputkan.</li>
                            <li><strong>Profil Dasar:</strong> Nama panggilan yang Anda atur untuk personalisasi sapaan.</li>
                        </ul>
                    </section>

                    {/* 3. Penggunaan Data */}
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">3. Cara Kami Mengolah Data</h2>
                        <p>
                            Data Anda hanya digunakan untuk satu tujuan: <strong>menyediakan layanan pencatatan dan analisis keuangan untuk Anda sendiri.</strong>
                        </p>
                        <ul className="list-disc pl-5 space-y-1 mt-2 text-gray-700 dark:text-gray-300">
                            <li>Menampilkan dashboard keuangan, grafik, dan laporan.</li>
                            <li>Memproses perintah yang Anda kirimkan melalui Bot WhatsApp.</li>
                            <li>Mengingatkan Anda tentang tagihan atau status budget (jika fitur diaktifkan).</li>
                        </ul>
                    </section>

                    {/* 4. Privasi & Keamanan */}
                    <section className="bg-green-50 dark:bg-green-900/20 p-6 rounded-2xl border border-green-100 dark:border-green-800/30">
                        <h2 className="text-xl font-bold text-[#458B73] dark:text-[#5ecdad] mb-3">4. Privasi & Komitmen Kami</h2>
                        <p className="font-medium text-gray-900 dark:text-gray-200 mb-2">
                            Privasi Anda adalah prioritas mutlak kami.
                        </p>
                        <ul className="space-y-2">
                            <li className="flex gap-2">
                                ✅ <span><strong>Kami TIDAK memperjualbelikan data Anda</strong> kepada pihak ketiga, pengiklan, atau broker data manapun.</span>
                            </li>
                            <li className="flex gap-2">
                                ✅ <span>Data Anda tidak digunakan untuk profiling iklan atau tujuan komersial di luar layanan Kasaku.</span>
                            </li>
                            <li className="flex gap-2">
                                ✅ <span>Kami menerapkan standar keamanan teknis untuk melindungi data Anda dari akses yang tidak sah.</span>
                            </li>
                        </ul>
                    </section>

                    {/* 5. Hak Pengguna */}
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">5. Hak Anda (Kontrol Penuh)</h2>
                        <p>
                            Anda memiliki kendali penuh atas data Anda. Anda berhak untuk:
                        </p>
                        <ul className="list-disc pl-5 space-y-1 mt-2 text-gray-700 dark:text-gray-300">
                            <li>Mengakses dan melihat seluruh riwayat transaksi Anda kapan saja.</li>
                            <li>Mengubah atau menghapus data transaksi tertentu.</li>
                            <li><strong>Menghapus Akun:</strong> Anda dapat meminta penghapusan akun serta seluruh data terkait secara permanen melalui menu Pengaturan di aplikasi.</li>
                        </ul>
                    </section>

                    {/* 6. Penutup */}
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">6. Perubahan Syarat</h2>
                        <p>
                            Kami dapat memperbarui syarat ini seiring perkembangan aplikasi. Setiap perubahan signifikan akan kami informasikan kepada Anda. Dengan melanjutkan penggunaan aplikasi setelah perubahan, Anda dianggap menyetujui syarat yang baru.
                        </p>
                    </section>

                    <div className="pt-10 border-t border-gray-100 dark:border-gray-700 text-center">
                        <a href="/login" className="inline-block px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-medium rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
                            Kembali ke Halaman Login
                        </a>
                    </div>
                </div>
            </div>
        </main>
    );
}
