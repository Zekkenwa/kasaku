import DashboardFooter from "@/components/DashboardFooter";

export default function DashboardLayout({
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
