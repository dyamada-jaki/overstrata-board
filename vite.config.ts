/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// バインドマウント越しにファイル変更が届かない環境では WATCH_POLLING=1 にする
const usePolling = process.env.WATCH_POLLING === '1'

export default defineConfig({
  plugins: [react()],
  server: {
    watch: usePolling ? { usePolling: true, interval: 300 } : undefined,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
