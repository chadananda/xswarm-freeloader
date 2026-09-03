import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  root: '.',
  plugins: [tailwindcss(), svelte()],
  server: {
    port: 4010,
    proxy: {
      '/api': {
        target: 'http://localhost:4011',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist'
  }
})
