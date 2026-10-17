import { expect, test } from '@playwright/test'

test('盤面全体を表示し、マスの選択・維持・切替・解除ができる', async ({ page }, testInfo) => {
  await page.goto('/')
  const cells = page.getByRole('button', { name: /^マス / })
  await expect(cells).toHaveCount(100)
  const labels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
  for (const axis of ['横の座標', '縦の座標']) {
    await expect(page.getByRole('group', { name: axis }).locator('span')).toHaveText(labels)
  }
  await expect(cells.first()).toHaveAccessibleName('マス (1, 1)')
  await expect(cells.last()).toHaveAccessibleName('マス (10, 10)')
  // ラベル込みの両端が画面内にあり、文書の横スクロールも発生しない。
  await expect(cells.first()).toBeInViewport({ ratio: 1 })
  await expect(cells.last()).toBeInViewport({ ratio: 1 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  )
  // 座標ラベル自身も上下左右とも画面内にある（左・上へのはみ出しは横スクロールでは分からない）。
  const { width: viewportWidth, height: viewportHeight } = page.viewportSize()!
  for (const axis of ['横の座標', '縦の座標']) {
    const axisLabels = page.getByRole('group', { name: axis }).locator('span')
    await expect(axisLabels.first()).toBeInViewport({ ratio: 1 })
    await expect(axisLabels.last()).toBeInViewport({ ratio: 1 })
    const boxes = await axisLabels.evaluateAll((elements) => elements.map((element) => {
      const { left, top, right, bottom } = element.getBoundingClientRect()
      return { label: element.textContent, left, top, right, bottom }
    }))
    expect(boxes).toHaveLength(10)
    for (const box of boxes) {
      const message = `${axis} ${box.label}: ${JSON.stringify(box)}`
      expect(box.left, message).toBeGreaterThanOrEqual(0)
      expect(box.top, message).toBeGreaterThanOrEqual(0)
      expect(box.right, message).toBeLessThanOrEqual(viewportWidth)
      expect(box.bottom, message).toBeLessThanOrEqual(viewportHeight)
    }
  }
  const shapes = await cells.evaluateAll((elements) => elements.map((element) => {
    const { width, height } = element.getBoundingClientRect()
    return { width, height }
  }))
  for (const { width, height } of shapes) {
    expect(width).toBeGreaterThan(0)
    expect(Math.abs(width - height)).toBeLessThan(1)
  }

  const first = page.getByRole('button', { name: 'マス (1, 1)', exact: true })
  const next = page.getByRole('button', { name: 'マス (3, 4)', exact: true })
  await expect(page.getByRole('button', { pressed: true })).toHaveCount(0)
  await first.click()
  await expect(first).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { pressed: true })).toHaveCount(1)
  await testInfo.attach('盤面の選択表示', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  await page.getByRole('main').click({ position: { x: 4, y: 4 } })
  await expect(first).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { pressed: true })).toHaveCount(1)
  await next.click()
  await expect(first).toHaveAttribute('aria-pressed', 'false')
  await expect(next).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { pressed: true })).toHaveCount(1)
  await next.click()
  await expect(page.getByRole('button', { pressed: true })).toHaveCount(0)
})
