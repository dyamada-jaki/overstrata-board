import { expect, test, type Page } from '@playwright/test'

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true })
const token = (page: Page, name: string) => page.getByRole('button', { name: new RegExp(`(?:^未配置 | )${name}（`) })
const cell = (page: Page, x: number, y: number) => page.getByRole('button', { name: new RegExp(`^マス \\(${x}, ${y}\\)`) })
const circleFilter = (page: Page, name: string) => token(page, name).locator('.board-token').evaluate((el) => getComputedStyle(el).filter)

// 同じボタン・状態欄・下の部品が切替で動かないことを、宣言値でなく実測する。
async function geometry(page: Page, toggleName: string) {
  const targets = [button(page, toggleName), page.getByText(/^状態：/), button(page, 'この駒を削除'), button(page, '駒を増やす')]
  return Promise.all(targets.map((target) => target.boundingBox()))
}

test('倒れた未配置駒の初回配置→確定→移動禁止→復帰→範囲外移動を使え、フィルターとフォーカスを保つ', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.getByRole('textbox', { name: '味方の数' }).fill('1')
  await page.getByRole('textbox', { name: '敵の数' }).fill('1')
  await button(page, '駒を用意する').click()
  const normalFilters: Record<string, string> = {}
  for (const name of ['味方1', '敵1']) {
    await token(page, name).click()
    normalFilters[name] = await circleFilter(page, name)
    await button(page, '倒れた状態にする').scrollIntoViewIfNeeded()
    const before = await geometry(page, '倒れた状態にする')
    await button(page, '倒れた状態にする').click()
    await expect(button(page, '通常に戻す')).toBeFocused()
    await expect(page.getByText('状態：倒れている')).toBeVisible()
    await expect(token(page, name)).toHaveAccessibleName(/倒れた状態/)
    const fallenFilter = await circleFilter(page, name)
    expect(fallenFilter).not.toBe(normalFilters[name])
    expect(fallenFilter).toMatch(/grayscale\(1\).*brightness\(0\.\d+\)/)
    expect(await geometry(page, '通常に戻す')).toEqual(before)
    await expect(page.locator('.selected-piece .board-token')).toHaveCSS('filter', fallenFilter)
    await button(page, '通常に戻す').click()
    await expect(button(page, '倒れた状態にする')).toBeFocused()
    expect(await circleFilter(page, name)).toBe(normalFilters[name])
    expect(await geometry(page, '倒れた状態にする')).toEqual(before)
    await button(page, '倒れた状態にする').click()
  }
  await page.getByRole('button', { name: /未配置 味方1/ }).click()
  await cell(page, 1, 1).click()
  await expect(cell(page, 1, 1)).toHaveAccessibleName('マス (1, 1) 味方1（味方・移動力5・倒れた状態）')
  await expect(page.getByRole('button', { pressed: true })).toHaveCount(0)
  await token(page, '敵1').click()
  await cell(page, 2, 1).click()
  await button(page, '確定').click()
  await token(page, '味方1').click()
  const rangeBefore = await page.getByRole('button', { name: / 移動範囲$/ }).evaluateAll((elements) => elements.map((el) => el.getAttribute('aria-label')))
  for (const [x, y] of [[3, 1], [10, 10]]) {
    await cell(page, x!, y!).click()
    await expect(cell(page, 1, 1)).toHaveAttribute('aria-pressed', 'true')
    await expect(cell(page, 1, 1)).toHaveAccessibleName(/味方1.*倒れた状態/)
    expect(await page.getByRole('button', { name: / 移動範囲$/ }).evaluateAll((elements) => elements.map((el) => el.getAttribute('aria-label')))).toEqual(rangeBefore)
  }
  await expect(cell(page, 1, 1).locator('.board-token')).toHaveCSS('filter', /grayscale\(1\).*brightness/)
  await expect(cell(page, 1, 1).locator('.board-token')).toHaveText('1')
  await testInfo.attach('倒れた両陣営と選択枠', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
  await button(page, '通常に戻す').click()
  expect(await circleFilter(page, '味方1')).toBe(normalFilters['味方1'])
  await cell(page, 10, 10).click()
  await expect(cell(page, 10, 10)).toHaveAccessibleName('マス (10, 10) 味方1（味方・移動力5）')
  await expect(cell(page, 2, 1)).toHaveAccessibleName(/敵1.*倒れた状態/)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width)
})
