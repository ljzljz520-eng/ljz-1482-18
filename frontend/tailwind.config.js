/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          500: "#165dff",
          600: "#0e4fd8",
          700: "#0a3fa8"
        }
      },
      fontFamily: {
        sans: ["Inter", "PingFang SC", "Microsoft YaHei", "system-ui", "sans-serif"]
      },
      boxShadow: {
        card: "0 8px 30px rgba(15, 23, 42, 0.08)",
        pop: "0 16px 50px rgba(15, 23, 42, 0.18)"
      }
    }
  },
  plugins: []
};
