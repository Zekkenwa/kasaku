import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Simulation from "@/components/landing/Simulation";
import Footer from "@/components/landing/Footer";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle"; // Assuming you might want a theme toggle here, but header usually has it. 
// Or we can create a simple Header component for Landing Page if needed.

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-900 transition-colors duration-300">
      {/* Navbar Overlay */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 py-4 md:py-6 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200/50 dark:border-neutral-800/50">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Kasaku Logo" className="w-8 h-8 rounded-lg shadow-sm" />
            <span className="font-bold text-xl tracking-tight text-neutral-900 dark:text-white">Kasaku</span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-brand-green transition-colors hidden md:block">
              Masuk
            </Link>
            <Link href="/register" className="px-5 py-2 rounded-full bg-brand-green text-white text-sm font-bold shadow-lg shadow-brand-green/20 hover:scale-105 transition-transform">
              Daftar Sekarang
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <Hero />
        <Simulation />
        <Features />
      </main>

      <Footer />
    </div>
  );
}
