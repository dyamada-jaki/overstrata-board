import { expect, test } from '@playwright/test'

test('盤面全体を表示し、マスの選択・維持・切替・解除ができる', async ({ page }, testInfo) => {
  await page.goto('/')
  const cells = page.getByRole('button', { name: /^マス / })
  await expect(cells).toHaveCount(100)
  const labels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
  for (const axis of ['横の座標', '縦の座標']) {
    const axisLabels = page.getByRole('group', { name: axis }).locator('span')
    await expect(axisLabels).toHaveText(labels)
    // マスが収まっていても、ラベルだけが左や上にはみ出す回帰を検出する。
    for (let index = 0; index < labels.length; index += 1) {
      const label = axisLabels.nth(index)
      try {
        await expect(label, `${axis}のラベル「${labels[index]}」が全体表示される`)
          .toBeInViewport({ ratio: 1 })
      } catch (error) {
        // 四辺を独自判定せず、失敗時の実測値だけを診断用に添える。
        await testInfo.attach(`${axis}のラベル${labels[index]}の表示位置`, {
          body: JSON.stringify({
            axis,
            label: labels[index],
            ...await label.evaluate((element) => ({
              rect: element.getBoundingClientRect().toJSON(),
              viewport: { width: window.innerWidth, height: window.innerHeight },
            })),
          }, null, 2),
          contentType: 'application/json',
        })
        throw error
      }
    }
  }
  await expect(cells.first()).toHaveAccessibleName('マス (1, 1)')
  await expect(cells.last()).toHaveAccessibleName('マス (10, 10)')
  // 両端のマスも画面内にあり、文書の横スクロールも発生しない。
  await expect(cells.first()).toBeInViewport({ ratio: 1 })
  await expect(cells.last()).toBeInViewport({ ratio: 1 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  )
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
