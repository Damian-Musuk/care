import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // /post/ gets its own page so its home screen app ("Care Post") opens at /post/,
      // even on phones that read the manifest before any script runs.
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        post: resolve(import.meta.dirname, 'post/index.html'),
      },
    },
  },
})
