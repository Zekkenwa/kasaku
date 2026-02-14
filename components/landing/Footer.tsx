import Link from "next/link";

export default function Footer() {
    return (
        <footer className="bg-neutral-900 text-white py-12 md:py-16">
            <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8 border-b border-neutral-800 pb-12 mb-12">
                    <div className="text-center md:text-left">
                        <h2 className="text-3xl font-bold mb-2">Zekkenwa/Kasaku</h2>
                        <p className="text-neutral-400 max-w-sm">
                            Open source personal finance manager. Built with ❤️ for the community.
                        </p>
                    </div>
                    <div className="flex gap-6">
                        <Link href="/login" className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                            Masuk
                        </Link>
                        <Link href="/register" className="px-6 py-2 rounded-lg bg-brand-green hover:bg-brand-green/90 transition-colors font-semibold">
                            Daftar Gratis
                        </Link>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-neutral-500">
                    <p>© 2026 Kasaku. Open Source MIT License.</p>
                    <div className="flex gap-6">
                        <a href="/syarat-ketentuan" className="hover:text-white transition-colors">Privacy & Terms</a>
                        <a href="https://github.com/Zekkenwa" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
