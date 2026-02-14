import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: "selector",
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-conic":
                    "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
            },
            fontFamily: {
                sans: ["Manrope", "sans-serif"],
            },
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                brand: {
                    red: "#F26076",    // Pinkish Red
                    orange: "#FF9760", // Soft Orange
                    yellow: "#FFD150", // Sunny Yellow
                    green: "#458B73",  // Trusted Teal/Green
                    dark: "#1E1E1E",   // Background Dark
                    card: "#252525",   // Card Dark
                },
            },
        },
    },
    plugins: [],
};
export default config;
