import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F7EBC0",
        "steel-blue": "#4A6D92",
        "label-orange": "#F39A1E",
        ink: "#1B1B22",
        takoyaki: {
          DEFAULT: "#C25A1E",
          shadow: "#7A3212",
          highlight: "#E58A3B",
        },
        mayo: "#F3E9D6",
        "green-onion": "#86C23F",
        tray: {
          DEFAULT: "#E9D3A3",
          shadow: "#BFA676",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      letterSpacing: { tightest: "-0.045em" },
    },
  },
  plugins: [],
};

export default config;
