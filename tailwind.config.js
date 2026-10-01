/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          950: "#0B2E1B",
          900: "#0E3B22",
          800: "#10482A",
          700: "#015A2B",
          DEFAULT: "#026E34",
          light: "#00A85A",
        },
        primary: "#026E34",
        accent: "#00A85A",
        gold: {
          DEFAULT: "#E2BF59",
          deep: "#B8963E",
          soft: "#F3E3AC",
        },
        cream: "#F0ED86",
        ink: "#1C1C1C",
        paper: "#F8F7F2",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      maxWidth: { shell: "1360px" },
      boxShadow: {
        institutional: "0 1px 0 rgba(28,28,28,.08), 0 12px 32px -16px rgba(11,46,27,.25)",
        card: "0 1px 2px rgba(11,46,27,.08), 0 8px 24px -12px rgba(11,46,27,.18)",
      },
    },
  },
  plugins: [],
};
