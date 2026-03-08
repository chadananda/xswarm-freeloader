import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    platformProxy: { enabled: true },
  }),
  vite: {
    ssr: {
      external: ['node:crypto', 'node:stream', 'node:util', 'crypto', 'stream', 'util'],
    },
  },
  integrations: [
    svelte(),
    tailwind({ configFile: './tailwind.config.mjs' }),
    sitemap(),
  ],
  site: 'https://freeloader.xswarm.ai',
});
