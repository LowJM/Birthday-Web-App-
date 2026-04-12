/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#6366f1",
        "primary-hover": "#4f46e5",
        "bg-color": "#0f172a",
        "card-bg": "#1e293b",
        "text-main": "#f8fafc",
        "text-muted": "#94a3b8",
        "border-color": "#334155",
        accent: "#10b981",
      },
      screens: {
        'xs': '420px',
      },
    },
  },
  plugins: [],
}
