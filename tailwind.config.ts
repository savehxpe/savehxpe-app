import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                primary: "#ffffff",
                "background-light": "#f7f7f7",
                "background-dark": "#000000",
                surface: "#111111",
            },
            fontFamily: {
                display: ["var(--font-space-grotesk)", "sans-serif"],
                mono: ["var(--font-geist-mono)", "monospace"],
            },
            borderRadius: {
                DEFAULT: "0px",
                lg: "0px",
                xl: "0px",
                full: "9999px",
            },
            animation: {
                "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                flicker: "flicker 4s infinite",
                blink: "blink 1s step-end infinite",
            },
            keyframes: {
                flicker: {
                    "0%, 19.999%, 22%, 62.999%, 64%, 64.999%, 70%, 100%": { opacity: "0.99" },
                    "20%, 21.999%, 63%, 63.999%, 65%, 69.999%": { opacity: "0.4" },
                },
                blink: {
                    "0%, 100%": { opacity: "1" },
                    "50%": { opacity: "0" },
                },
            },
        },
    },
    plugins: [],
};
export default config;
