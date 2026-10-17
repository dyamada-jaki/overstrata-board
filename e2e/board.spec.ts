import { expect, test, type Page } from '@playwright/test'

function board(page: Page) {
  return page.getByRole('table', { name: '盤面' })
}

function cell(page: Page, name: string) {
  return board(page).getByRole('button', { name, exact: true })
}

test('マスを選択 → 別のマスへ切り替え → 余白タップで維持 → 同じマスで解除できる', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.stack ?? error.message))
  await page.goto('/')

  await expect(board(page).getByRole('button')).toHaveCount(100)
  await expect(board(page).getByRole('button', { pressed: true })).toHaveCount(0)

  await cell(page, '(3, 4)').click()
  await expect(cell(page, '(3, 4)')).toHaveAttribute('aria-pressed', 'true')
  await expect(board(page).getByRole('button', { pressed: true })).toHaveCount(1)

  await cell(page, '(5, 6)').click()
  await expect(cell(page, '(5, 6)')).toHaveAttribute('aria-pressed', 'true')
  await expect(cell(page, '(3, 4)')).toHaveAttribute('aria-pressed', 'false')
  await expect(board(page).getByRole('button', { pressed: true })).toHaveCount(1)

  // 盤面の下の余白をクリックする
  const box = await board(page).boundingBox()
  const viewport = page.viewportSize()
  if (!box || !viewport) throw new Error('盤面または画面の大きさを取得できません')
  const marginY = box.y + box.height + (viewport.height - box.y - box.height) / 2
  expect(marginY, '盤面の下に余白がある').toBeLessThan(viewport.height)
  await page.mouse.click(box.x + box.width / 2, marginY)
  await expect(cell(page, '(5, 6)')).toHaveAttribute('aria-pressed', 'true')
  await expect(board(page).getByRole('button', { pressed: true })).toHaveCount(1)

  await cell(page, '(5, 6)').click()
  await expect(board(page).getByRole('button', { pressed: true })).toHaveCount(0)

  expect(errors, '未処理の JavaScript 例外がない').toEqual([])
})

test('座標ラベルを含む盤面全体が横スクロールなしに収まる', async ({ page }) => {
  await page.goto('/')
  await expect(board(page).getByRole('button')).toHaveCount(100)

  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(scrollWidth, '横スクロールが出ない').toBeLessThanOrEqual(innerWidth)

  const viewport = page.viewportSize()
  if (!viewport) throw new Error('画面の大きさを取得できません')
  for (const target of [
    board(page).getByRole('columnheader', { name: '10', exact: true }),
    board(page).getByRole('rowheader', { name: '1', exact: true }),
    cell(page, '(1, 1)'),
    cell(page, '(10, 10)'),
  ]) {
    const box = await target.boundingBox()
    if (!box) throw new Error('要素の位置を取得できません')
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
  }
})
