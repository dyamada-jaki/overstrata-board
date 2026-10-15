import { defineConfig } from '@playwright/test'

// worktree ごとの設定（E2E_HOST_PORT など）を .env から読む。無ければ既定値を使う
try {
  process.loadEnvFile('.env')
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
}

const isCI = !!process.env.CI
// Docker モード（scripts/e2e-docker.sh）では、同じ Compose プロジェクト内の e2e-web を開く
const externalBaseURL = process.env.E2E_BASE_URL
const hostPort = process.env.E2E_HOST_PORT ?? '4173'
const baseURL = externalBaseURL ?? `http://127.0.0.1:${hostPort}`

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e-results/artifacts',
  forbidOnly: isCI,
  // 再試行で通っただけの不安定なテストを正常扱いしない（docs/testing.md 4章）
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: './e2e-results/report', open: 'never' }],
    ...(isCI ? [['github'] as const] : []),
  ],
  use: {
    baseURL,
    browserName: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile-375',
      use: {
        viewport: { width: 375, height: 667 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'desktop-1280',
      use: {
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  // ホストモードでは、この checkout から本番用イメージをビルドしてコンテナで配信する。
  // reuseExistingServer: false なので、ポートが既に使われていれば（別 worktree のサーバーなど）起動前に失敗する
  webServer: externalBaseURL
    ? undefined
    : {
        command: 'sh scripts/e2e-web.sh',
        url: baseURL,
        reuseExistingServer: false,
        timeout: 180_000,
        stdout: 'pipe',
        stderr: 'pipe',
        gracefulShutdown: { signal: 'SIGTERM', timeout: 15_000 },
        env: { E2E_HOST_PORT: hostPort },
      },
})
