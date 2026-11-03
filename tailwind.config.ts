import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Viewfinder palette — dark cinematic, warm whites, single REC accent
        ink: "#121315",
        char: { DEFAULT: "#1a1b1e", 2: "#222428", 3: "#2b2d32" },
        line: "#383a40",
        bone: { DEFAULT: "#f2ede4", 2: "#e6e0d5" },
        mute: "#b3ada3", // 8.4:1 on char
        dim: "#948f86", // 5.6:1 on char
        rec: { DEFAULT: "#ff4433", ink: "#160806" },
      },
      fontFamily: {
        sans: ["var(--font-archivo)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out",
        "slide-up": "slideUp 0.6s ease-out",
        "pulse-slow": "pulse 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
