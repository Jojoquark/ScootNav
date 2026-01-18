import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // Use relative paths for GitHub Pages
  build: {
    outDir: 'docs', // Output to docs folder for GitHub Pages
    assetsDir: 'assets',
  },
})

