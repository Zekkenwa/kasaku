"use client";

import { useTheme } from "./ThemeProvider";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;
    return null; // Force hidden for Sole Dark Mode

    return (
        <div className="fixed top-4 right-4 z-[9999]">
            <div
                className={`w-14 h-8 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${theme === "dark" ? "bg-gray-700" : "bg-white border border-gray-200 shadow-sm"}`}
                onClick={toggleTheme}
            >
                {/* Switch Knob */}
                <div
                    className={`w-6 h-6 rounded-full shadow-md transform duration-300 ease-in-out flex items-center justify-center
            ${theme === "dark" ? "translate-x-6 bg-gray-800 text-white" : "translate-x-0 bg-white text-yellow-500"}
          `}
                >
                    {theme === "dark" ? (
                        <span className="text-xs">🌙</span>
                    ) : (
                        <span className="text-xs">☀️</span>
                    )}
                </div>
            </div>
        </div>
    );
}
