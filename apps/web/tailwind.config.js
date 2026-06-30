/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Source Sans 3"', 'system-ui', 'sans-serif'],
      },
      colors: {
        cream: '#F7F4EF',
        ink: '#1A1A1A',
        accent: '#E03E2F',
        muted: '#6B6560',
        card: '#FFFFFF',
      },
      boxShadow: {
        card: '0 2px 20px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
