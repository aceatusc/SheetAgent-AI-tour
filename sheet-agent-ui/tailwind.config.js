/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#1e1e1e',
          light: '#2d2d2d',
          dark: '#171717',
        },
      },
    },
  },
  plugins: [],
}
