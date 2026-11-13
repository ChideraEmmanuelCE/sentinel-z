import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#07090E",
        panel: "#10141D",
        zcash: "#F4B728",
        emerald: "#10B981"
      },
      boxShadow: {
        glow: "0 0 36px rgba(244, 183, 40, 0.16)"
      }
    }
  },
  plugins: []
};
export default config;
