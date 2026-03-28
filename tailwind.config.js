/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        game: [
          'var(--font-monopoly)',
          'Nunito',
          'ui-rounded',
          '"Microsoft JhengHei"',
          '"PingFang TC"',
          'sans-serif',
        ],
      },
      colors: {
        'codename-red': '#ef4444',
        'codename-blue': '#3b82f6',
        'codename-black': '#1f2937',
        'codename-beige': '#f5f5dc',
      },
    },
  },
  plugins: [],
}
