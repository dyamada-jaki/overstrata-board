import { expect, test, type Locator, type Page } from '@playwright/test'

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true, includeHidden: true })
const token = (page: Page, name: string) => page.getByRole('button', { name: new RegExp(`(?:^未配置 | )${name}（`), includeHidden: true })
const cell = (page: Page, x: number, y: number) => page.getByRole('button', { name: new RegExp(`^マス \\(${x}, ${y}\\)`), includeHidden: true })
const popup = (page: Page) => page.getByRole('dialog', { name: /の設定$/ })
async function prepare(page: Page, count = '2') {
  await page.goto('/')
  await page.getByRole('textbox', { name: '味方の数' }).fill(count)
  await button(page, '駒を用意する').click()
}
async function box(locator: Locator) {
  const value = await locator.boundingBox()
  expect(value).not.toBeNull()
  return value!
}
async function expectContained(page: Page) {
  const rect = await box(popup(page))
  expect(rect.x).toBeGreaterThanOrEqual(8)
  expect(rect.y).toBeGreaterThanOrEqual(8)
  expect(rect.x + rect.width).toBeLessThanOrEqual(page.viewportSize()!.width - 8)
  expect(rect.y + rect.height).toBeLessThanOrEqual(page.viewportSize()!.height - 8)
}

test('下端で0→1→2→1→0と連続操作しても開始数と追加数の±がずれない', async ({ page }, testInfo) => {
  await page.goto('/')
  const records = []
  for (const side of ['味方', '敵']) {
    const plus = button(page, `${side}の数を増やす`)
    const minus = button(page, `${side}の数を減らす`)
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight))
    const before = await box(plus)
    const decrement = await box(minus)
    for (const [target, value] of [[before, '1'], [before, '2'], [decrement, '1'], [decrement, '0']] as const) {
      await page.mouse.click(target.x + target.width / 2, target.y + target.height / 2)
      await expect(page.getByRole('textbox', { name: `${side}の数`, exact: true })).toHaveValue(value)
      expect(await box(plus)).toEqual(before)
    }
    records.push({ side, before, after: await box(plus) })
  }
  await page.getByRole('textbox', { name: '味方の数' }).fill('1')
  await button(page, '駒を用意する').click()
  await button(page, '駒を増やす').click()
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight))
  const plus = button(page, '敵の追加数を増やす')
  const before = await box(plus)
  await plus.click()
  expect(await box(plus)).toEqual(before)
  await button(page, '敵の追加数を減らす').click()
  expect(await box(plus)).toEqual(before)
  records.push({ side: '追加', before, after: await box(plus) })
  await testInfo.attach('下端の±実測値', { body: JSON.stringify(records, null, 2), contentType: 'application/json' })
})

test('選択と右クリック・設定開閉で位置を保ち、外側の操作は閉じるだけに使う', async ({ page }, testInfo) => {
  await prepare(page)
  await token(page, '味方1').scrollIntoViewIfNeeded()
  const before = await box(token(page, '味方1'))
  await token(page, '味方1').click()
  await expect(popup(page)).toHaveCount(0)
  expect(await box(token(page, '味方1'))).toEqual(before)
  await token(page, '味方2').click()
  await token(page, '味方1').click()
  expect(await box(token(page, '味方1'))).toEqual(before)
  for (const targetKind of ['token', 'control']) {
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight))
    const anchor = await box(token(page, '味方1'))
    const board = await box(page.getByRole('group', { name: '戦闘盤面', includeHidden: true }))
    const scroll = await page.evaluate(() => scrollY)
    await token(page, '味方1').click({ button: 'right' })
    await expect(popup(page)).toBeVisible()
    await expectContained(page)
    expect(await box(token(page, '味方1'))).toEqual(anchor)
    expect(await box(page.getByRole('group', { name: '戦闘盤面', includeHidden: true }))).toEqual(board)
    expect(await page.evaluate(() => scrollY)).toBe(scroll)
    // 背景の部品がpopupに重ならない場所を使用。
    const dialogBox = await box(popup(page))
    const candidates = targetKind === 'token' ? [token(page, '味方2')]
      : [button(page, '設定'), button(page, '駒を増やす'), button(page, '準備をやり直す')]
    let point: { x: number; y: number } | undefined
    for (const candidate of candidates) {
      const rect = await box(candidate)
      const p = { x: rect.x + rect.width - 2, y: rect.y + rect.height - 2 }
      if (p.y >= 0 && p.y < page.viewportSize()!.height
        && (p.y < dialogBox.y || p.y > dialogBox.y + dialogBox.height || p.x < dialogBox.x || p.x > dialogBox.x + dialogBox.width)) {
        point = p
        break
      }
    }
    expect(point, 'popupと重ならない背景の駒/操作ボタンを実座標で押す').toBeDefined()
    if (!point) throw new Error('外側の操作対象が見つからない')
    await page.mouse.click(point.x, point.y)
    await expect(popup(page)).toHaveCount(0)
    await expect(token(page, '味方1')).toHaveAttribute('aria-pressed', 'true')
    await expect(token(page, '味方2')).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByRole('group', { name: '駒の追加数' })).toHaveCount(0)
    expect(await page.evaluate(() => scrollY)).toBe(scroll)
  }
  await button(page, '設定').click()
  await expect(button(page, '設定を閉じる')).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(button(page, 'この駒を削除')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(button(page, '設定を閉じる')).toBeFocused()
  await button(page, 'この駒を削除').click()
  await expect(button(page, 'キャンセル')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(button(page, 'この駒を削除')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(button(page, '設定')).toBeFocused()
  await testInfo.attach('未配置と常設設定', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
})

test('画面端の配置済み駒でも設定が収まり、外の空きマスで閉じても移動しない', async ({ page }, testInfo) => {
  await prepare(page, '4')
  const positions = [[1, 1], [10, 1], [1, 10], [10, 10]] as const
  for (const [index, [x, y]] of positions.entries()) {
    await token(page, `味方${index + 1}`).click()
    await cell(page, x, y).click()
  }
  for (const [x, y] of positions) {
    await cell(page, x, y).scrollIntoViewIfNeeded()
    const before = await box(cell(page, x, y))
    await cell(page, x, y).click({ button: 'right' })
    await expectContained(page)
    expect(await box(cell(page, x, y))).toEqual(before)
    await testInfo.attach(`画面端-${x}-${y}`, { body: await page.screenshot(), contentType: 'image/png' })
    await page.keyboard.press('Escape')
    await expect(cell(page, x, y)).toBeFocused()
  }
  await cell(page, 10, 10).click({ button: 'right' })
  const target = await box(cell(page, 1, 1))
  await page.mouse.click(target.x + target.width / 2, target.y + target.height / 2)
  await expect(popup(page)).toHaveCount(0)
  await expect(cell(page, 10, 10)).toHaveAttribute('aria-pressed', 'true')
  await expect(cell(page, 1, 1)).toHaveAttribute('aria-pressed', 'false')
  await cell(page, 10, 10).click({ button: 'right' })
  const empty = await box(cell(page, 2, 1))
  await page.mouse.click(empty.x + empty.width / 2, empty.y + empty.height / 2)
  await expect(cell(page, 10, 10)).toHaveAccessibleName(/味方4/)
  // (10,10)から(2,1)は移動力5の範囲外。選択は味方4のまま。
  await expect(cell(page, 2, 1)).toHaveAccessibleName('マス (2, 1)')
  await expect(cell(page, 10, 10)).toHaveAttribute('aria-pressed', 'true')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(page.viewportSize()!.width)
})

test('実タッチの長押しで開き、短いタップ・10px超の移動・スクロールは開かない', async ({ browser, baseURL }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile', 'タッチ操作は375pxで確認')
  const context = await browser.newContext({ baseURL, viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true })
  const page = await context.newPage()
  await prepare(page, '10')
  await token(page, '味方1').scrollIntoViewIfNeeded()
  const cdp = await context.newCDPSession(page)
  const start = async (name = '味方1') => {
    const rect = await box(token(page, name))
    const point = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
    return point
  }
  const end = () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await start()
  await page.waitForTimeout(150)
  await expect(popup(page)).toHaveCount(0)
  await end()
  await expect(token(page, '味方1')).toHaveAttribute('aria-pressed', 'true')
  await start('味方2')
  await expect(popup(page)).toBeVisible()
  await end()
  await expect(popup(page)).toHaveAccessibleName('味方2の設定')
  await expect(token(page, '味方2')).toHaveAttribute('aria-pressed', 'true')
  await testInfo.attach('タッチ長押し', { body: await page.screenshot(), contentType: 'image/png' })
  const other = await box(token(page, '味方1'))
  await page.touchscreen.tap(other.x + other.width / 2, other.y + other.height / 2)
  await expect(popup(page)).toHaveCount(0)
  await expect(token(page, '味方2')).toHaveAttribute('aria-pressed', 'true')
  await expect(token(page, '味方1')).toHaveAttribute('aria-pressed', 'false')
  await button(page, '設定').tap()
  await button(page, '設定を閉じる').tap()
  const point = await start()
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: point.x + 11, y: point.y }] })
  await page.waitForTimeout(650)
  await expect(popup(page)).toHaveCount(0)
  await end()
  await page.evaluate(() => scrollTo(0, 350))
  const scrollBefore = await page.evaluate(() => scrollY)
  const p = await start()
  for (let dy = 15; dy <= 90; dy += 15) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x, y: p.y - dy }] })
  }
  await page.waitForTimeout(650)
  await end()
  await expect(popup(page)).toHaveCount(0)
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(scrollBefore)
  await context.close()
})
