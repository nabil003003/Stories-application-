/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        fg: "var(--fg)",
        panel: "var(--panel)",
        "panel-alt": "var(--panel-alt)",
        border: "var(--border)",
        muted: "var(--muted)",
        "muted-fg": "var(--muted-fg)",
        accent: "var(--accent)",
        "accent-fg": "var(--accent-fg)",
        danger: "var(--danger)",
        warning: "var(--warning)",
        success: "var(--success)",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "'JetBrains Mono'",
          "'Fira Code'",
          "Consolas",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
