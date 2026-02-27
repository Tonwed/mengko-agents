import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/postcss';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  site: 'https://mengko.ai',
  // For GitHub Pages deployment from repo
  // Uncomment the line below if deploying to GitHub Pages from a repo (not custom domain)
  // base: '/mengko-agents',
  build: {
    assets: 'assets',
  },
  vite: {
    css: {
      postcss: {
        plugins: [tailwindcss],
      },
    },
  },
});