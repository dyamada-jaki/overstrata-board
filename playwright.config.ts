import { defineConfig } from '@playwright/test'

const baseURL = process.env.E2E_BASE_URL
const artifacts = process.env.E2E_ARTIFACT_DIR
if (!baseURL || !artifacts) {
  throw new Error('npm run test:e2e で専用アプリを起動して実行してください')
}

export default defineConfig({
  testDir: './e2e',
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: `${artifacts}/report`, open: 'never' }],
  ],
  outputDir: `${artifacts}/test-results`,
  use: {
    baseURL,
    browserName: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium-mobile', use: { viewport: { width: 375, height: 667 } } },
    { name: 'chromium-desktop', use: { viewport: { width: 1280, height: 720 } } },
  ],
})
