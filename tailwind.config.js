/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}', // Mantido, pois a pasta 'components' existe
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}