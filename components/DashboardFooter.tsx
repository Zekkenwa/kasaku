import Link from "next/link";

export default function DashboardFooter() {
    const year = new Date().getFullYear();

    return (
        <footer className="w-full py-8 mt-auto border-t border-white/5 bg-[#1a1a1a]">
            <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-neutral-500">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-neutral-400">Kasaku</span>
                    <span>&copy; {year}</span>
                </div>

                <div className="flex gap-6">
                    <Link href="/syarat-ketentuan" className="hover:text-white transition-colors">Privacy & Terms</Link>
                    <a href="https://github.com/Zekkenwa" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
                    <a href="mailto:chalsinglalim@gmail.com" className="hover:text-[#458B73] transition-colors">Report Bug</a>
                </div>

                <div className="hidden md:block">
                    Built with ☕ & ❤️
                </div>
            </div>
        </footer>
    );
}
