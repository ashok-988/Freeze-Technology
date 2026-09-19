/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#2F612F", // Forest Green
          dark: "#244b24",
          light: "#4D8A4D",
          soft: "#EEF2EE",
          accent: "#FFF101", // Bright Yellow
        },
        surface: "#FFFFFF",
        canvas: "#F7F8F6",
      },
      borderRadius: {
        card: "10px",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
