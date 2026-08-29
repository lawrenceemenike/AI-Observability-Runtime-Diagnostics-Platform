/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        databerry: {
          canvas: '#F4F6FA',
          navy: '#1E2265',
          'navy-active': '#2B3080',
          'navy-dark': '#1F2438',
          hero: '#FFEFE7',
          orange: '#FF7A1A',
          green: '#00C853',
          red: '#FF3D71',
          purple: '#A259FF',
          pink: '#FF6EA7',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'databerry': '0 10px 30px -5px rgba(30, 34, 101, 0.05)',
        'databerry-lg': '0 20px 40px -10px rgba(30, 34, 101, 0.12)',
      }
    },
  },
  plugins: [],
}
