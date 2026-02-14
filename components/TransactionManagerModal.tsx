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
    // We might need to pass down categoryObjects or similar if CategoryManager needs it?
    // Based on DashboardClient usage: <CategoryManager categories={categoryObjects} />
    // TransactionForm needs: categories, categoryObjects, initialData, onClose, wallets
    categoryObjects: { id: string; name: string; type: string }[];
};

export default function TransactionManagerModal({ isOpen, onClose, defaultTab = "TRANSACTION", categories, wallets, initialData, categoryObjects }: Props) {
    const [activeTab, setActiveTab] = useState<"TRANSACTION" | "CATEGORY">(defaultTab);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 card-fix rounded-2xl shadow-xl max-h-[90vh] flex flex-col transition-colors">
                {/* Header with Tabs */}
                <div className="flex border-b border-gray-100 dark:border-gray-700">
                    <button
                        className={`flex-1 py-4 text-sm font-semibold transition-colors ${activeTab === "TRANSACTION" ? "text-[#458B73] border-b-2 border-[#458B73]" : "text-gray-900 hover:text-white dark:text-gray-400 dark:hover:text-gray-200"}`}
                        onClick={() => setActiveTab("TRANSACTION")}
                    >
                        {initialData ? "Edit Transaksi" : "Transaksi Baru"}
                    </button>
                    <button
                        className={`flex-1 py-4 text-sm font-semibold transition-colors ${activeTab === "CATEGORY" ? "text-[#458B73] border-b-2 border-[#458B73]" : "text-gray-900 hover:text-white dark:text-gray-400 dark:hover:text-gray-200"}`}
                        onClick={() => setActiveTab("CATEGORY")}
                    >
                        Kelola Kategori
                    </button>
                    <button onClick={onClose} className="absolute right-4 top-3 w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F26076]/10 hover:text-[#F26076] text-gray-400 transition-colors">
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 overflow-y-auto">
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
