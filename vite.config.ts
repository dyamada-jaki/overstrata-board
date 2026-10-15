/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// バインドマウント越しにファイル変更が届かない環境では WATCH_POLLING=1 にする
// （VITE_ で始まる名前はクライアントに公開される対象になるので使わない）
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
    // Playwright の E2E（e2e/）は収集しない。E2E は npm run test:e2e で実行する
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
