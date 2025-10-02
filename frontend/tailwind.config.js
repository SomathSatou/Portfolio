/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
      extend: {
        colors: {
          primary: "#5f2a62",
          primaryLight: "#a976c3",
          accent1: "#a0de59",
          accent2: "#466b5a",
          accent3: "#f5c024",
        },
        fontFamily: {
          display: ["Souvenir", "Georgia", "Times New Roman", "serif"],
          sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        },
      },
    },
    plugins: [],
  };