/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#f7f7f4',
        ink: '#1c1c1a',
        muted: '#6b6b64',
        line: '#e4e4dd',
        brand: {
          DEFAULT: '#0f6b5c',
          dark: '#0b5145',
          soft: '#e7f1ee',
        },
        accent: '#c46b2c',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(28, 28, 26, 0.05), 0 8px 24px rgba(28, 28, 26, 0.05)',
      },
    },
  },
  plugins: [],
};
