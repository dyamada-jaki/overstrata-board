import { expect, test } from '@playwright/test'

test('起動画面の見出しが表示され、未処理の JavaScript 例外がない', async ({ page, browser }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.stack ?? error.message))
  await testInfo.attach('実行環境', {
    body: JSON.stringify({
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
      chromium: browser.version(),
      viewport: page.viewportSize(),
    }, null, 2),
    contentType: 'application/json',
  })

  try {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Overstrata 戦闘ボード', exact: true })).toBeVisible()
    expect(errors, '起動中に未処理の JavaScript 例外が発生していない').toEqual([])
  } finally {
    await testInfo.attach('pageerror', {
      body: JSON.stringify(errors, null, 2),
      contentType: 'application/json',
    })
  }
})
