const defaultTheme = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Mode gelap diaktifkan lewat class "dark" di <html> (lihat lib/preferences.js)
  darkMode: "class",
  content: ["./pages/**/*.js", "./components/**/*.js", "./lib/**/*.js", "./hooks/**/*.js"],
  theme: {
    extend: {
      fontFamily: {
        // Diisi next/font di pages/_app.js
        sans: ["var(--font-jakarta)", ...defaultTheme.fontFamily.sans],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -8px rgba(15, 23, 42, 0.12)",
      },
    },
  },
  plugins: [],
};
