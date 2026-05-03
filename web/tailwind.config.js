/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#faf7f2',
        ink: '#1c1917',
        muted: '#57534e',
        accent: {
          DEFAULT: '#c45c3e',
          hover: '#a84a31',
        },
        stoneborder: '#e7e5e4',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 4px 24px rgba(28, 25, 23, 0.06)',
        lift: '0 12px 40px rgba(28, 25, 23, 0.08)',
      },
    },
  },
  plugins: [],
}
