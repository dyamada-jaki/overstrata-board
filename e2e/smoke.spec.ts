import { expect, test } from '@playwright/test'

test('起動画面に見出しが表示され、未処理の例外が出ない', async ({ page }, testInfo) => {
  const pageErrors: Error[] = []
  page.on('pageerror', (error) => pageErrors.push(error))

  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1, name: 'Overstrata 戦闘ボード（意図的な失敗）' })).toBeVisible()
  // プロジェクトで指定した幅（375px / 1280px）で実際に表示されていることを確かめる
  const expectedWidth = testInfo.project.use.viewport?.width
  expect(await page.evaluate(() => window.innerWidth)).toBe(expectedWidth)
  expect(pageErrors).toEqual([])
})
