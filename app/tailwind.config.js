/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Black & White theme
        primary: '#000000',
        secondary: '#666666',
        border: '#000000',
        'progress-fill': '#000000',
        'progress-empty': '#EEEEEE',
      },
      fontFamily: {
        mono: ['SF Mono', 'Consolas', 'Monaco', 'monospace'],
      },
    },
  },
  plugins: [],
}
