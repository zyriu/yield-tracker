import type { Config } from "tailwindcss";
export default {
    darkMode: "class",
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            colors: {
                bg: { DEFAULT: "#0b0f14", muted: "#0f141b", card: "#111821" },
                text: { DEFAULT: "#e5e7eb", muted: "#9ca3af" },
                brand: { DEFAULT: "#22d3ee", fg: "#0ea5b7" }
            },
            borderRadius: { xl: "1rem", "2xl": "1.25rem" }
        }
    },
    plugins: []
} satisfies Config;