import Link from "next/link";

export default function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="w-full py-6 mt-auto">
            <div className="container mx-auto px-4 text-center">
                <p className="text-sm font-medium" style={{ color: "#458B73" }}>
                    &copy; {year} Kasaku Personal Cashflow Tracker. All rights reserved.
                </p>
                <p className="text-xs mt-1 opacity-80" style={{ color: "#458B73" }}>
                    MIT License &bull; <a href="mailto:chalsinglalim@gmail.com?subject=Bug Report Kasaku" className="underline hover:text-green-700 transition-colors">Bug Report</a>
                </p>
            </div>
        </footer>
    );
}
