import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/moon/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
})
