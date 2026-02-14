"use client";

import { useEffect } from "react";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
};

export default function Modal({ isOpen, onClose, title, children }: Props) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }
        return () => { document.body.style.overflow = "auto"; };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-full max-w-lg bg-white dark:bg-gray-800 card-fix rounded-2xl shadow-xl max-h-[90vh] flex flex-col transition-colors">
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{title}</h3>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F26076]/10 hover:text-[#F26076] text-gray-400 transition-colors">
                        ✕
                    </button>
                </div>
                <div className="p-5 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
}
