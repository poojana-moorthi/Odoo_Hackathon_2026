/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f9f6f7',
          100: '#f2ecf0',
          200: '#e5dae1',
          300: '#cebecc',
          450: '#b099ad',
          500: '#714B67', // Odoo Purple
          600: '#623f58',
          700: '#513449',
          800: '#432b3c',
          900: '#392432',
          950: '#23131e',
        },
        odooTeal: {
          50: '#e6faf9',
          100: '#c2f3f1',
          200: '#85e7e3',
          300: '#47d1cc',
          400: '#1ab5b0',
          500: '#00A09D', // Odoo Teal
          600: '#008381',
          700: '#006665',
          800: '#035150',
          900: '#064342',
          950: '#022626',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
