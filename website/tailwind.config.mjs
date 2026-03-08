/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    fontFamily: {
      heading: ['"Permanent Marker"', 'cursive'],
      body: ['"Source Sans 3"', 'sans-serif'],
      typewriter: ['"Special Elite"', 'monospace'],
    },
    extend: {
      colors: {
        'page-bg': '#ede8df',
        cream:   '#f5f0e6',
        paper:   '#faf7f0',
        ink:     '#2d2a26',
        faded:   '#8b8579',
        savings: '#27864a',
        stamp:   '#d4831a',
        coupon:  '#c0392b',
        marker:  '#7b4baf',
        kraft:   '#c4b8a0',
      },
    },
  },
  plugins: [],
};
