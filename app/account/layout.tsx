import DashboardFooter from "@/components/DashboardFooter";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Pengaturan Akun - Kasaku",
};

export default function AccountLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#1a1a1a] flex flex-col">
            <main className="flex-1">
                {children}
            </main>
            <DashboardFooter />
        </div>
    );
}
