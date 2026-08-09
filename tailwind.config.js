/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // "Festival daylight" palette (locked, PRD.md) -- bright marigold/teal
        // for kid-facing screens. Parent dashboard deliberately breaks register
        // and uses cream/daylight tones instead -- see PRD.
        marigold: {
          DEFAULT: "#F5A623",
          50: "#FFF6E8",
          100: "#FEECC9",
          300: "#FBCE79",
          500: "#F5A623",
          700: "#C97F0F",
          900: "#7A4B08",
        },
        teal: {
          DEFAULT: "#158A82",
          50: "#E7F7F5",
          100: "#C6EDE9",
          300: "#6FC9C0",
          500: "#158A82",
          700: "#0E6862",
          900: "#083F3C",
        },
        cream: "#FFFBF2",
      },
      fontFamily: {
        display: ["Baloo 2", "system-ui", "sans-serif"],
        body: ["Mukta", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
