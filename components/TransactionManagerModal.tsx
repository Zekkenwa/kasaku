"use client";

import { useState } from "react";
import TransactionForm from "./TransactionForm";
import CategoryManager from "./CategoryManager";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    defaultTab?: "TRANSACTION" | "CATEGORY";
    categories: string[];
    wallets: { id: string; name: string }[];
    initialData?: any;
    categoryObjects: { id: string; name: string; type: string }[];
};

export default function TransactionManagerModal({ isOpen, onClose, defaultTab = "TRANSACTION", categories, wallets, initialData, categoryObjects }: Props) {
    const [activeTab, setActiveTab] = useState<"TRANSACTION" | "CATEGORY">(defaultTab);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-[#252525] rounded-3xl shadow-2xl border border-white/5 max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header with Tabs */}
                <div className="flex border-b border-white/5 bg-black/20">
                    <button
                        className={`flex-1 py-4 text-sm font-bold transition-all ${activeTab === "TRANSACTION" ? "text-[#458B73] border-b-2 border-[#458B73] bg-white/5" : "text-neutral-400 hover:text-white hover:bg-white/5"}`}
                        onClick={() => setActiveTab("TRANSACTION")}
                    >
                        {initialData ? "Edit Transaksi" : "Transaksi Baru"}
                    </button>
                    <button
                        className={`flex-1 py-4 text-sm font-bold transition-all ${activeTab === "CATEGORY" ? "text-[#458B73] border-b-2 border-[#458B73] bg-white/5" : "text-neutral-400 hover:text-white hover:bg-white/5"}`}
                        onClick={() => setActiveTab("CATEGORY")}
                    >
                        Kelola Kategori
                    </button>
                    <button onClick={onClose} className="absolute right-4 top-3.5 w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F26076]/20 text-neutral-500 hover:text-[#F26076] transition-colors">
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {activeTab === "TRANSACTION" ? (
                        <TransactionForm
                            categoryObjects={categoryObjects}
                            categories={categories}
                            initialData={initialData}
                            onClose={onClose}
                            wallets={wallets}
                        />
                    ) : (
                        <CategoryManager categories={categoryObjects} />
                    )}
                </div>
            </div>
        </div>
    );
}
