import { expect, test, type Locator, type Page } from '@playwright/test'
import { setCount } from './counts.ts'

const cell = (page: Page, x: number, y: number) => page.getByRole('button', { name: new RegExp(`^マス \\(${x}, ${y}\\)`) })
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true })
const viewport = (page: Page) => page.getByRole('group', { name: '盤面の表示領域' })
async function box(target: Locator) {
  const result = await target.boundingBox()
  if (!result) throw new Error('確認対象が表示されていません')
  return result
}
async function center(target: Locator) {
  const r = await box(target)
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
}
async function prepare(page: Page, x = 5, y = 5) {
  await page.goto('/')
  await setCount(page, '味方の数', 1)
  await button(page, '駒を用意する').click()
  await page.getByRole('button', { name: /^未配置 味方1/ }).click()
  await cell(page, x, y).click()
  await page.evaluate(() => window.scrollTo(0, 0))
}
async function zoom(page: Page, mobile: boolean) {
  const p = await center(viewport(page))
  if (mobile) {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x - 40, y: p.y }, { x: p.x + 40, y: p.y }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x - 80, y: p.y }, { x: p.x + 80, y: p.y }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await cdp.detach()
  } else {
    await page.mouse.move(p.x, p.y)
    await page.mouse.wheel(0, -Math.log(2) / 0.002)
  }
  await expect(page.getByText('倍率 2.0倍')).toBeVisible()
}
async function drag(page: Page, target: Locator, mobile: boolean, right = false) {
  const p = await center(target)
  if (mobile) {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x + 25, y: p.y + 15 }] })
    // 保持時間は長押しとの競合を作る入力条件。
    await page.waitForTimeout(650)
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await cdp.detach()
  } else {
    await page.mouse.move(p.x, p.y)
    await page.mouse.down({ button: right ? 'right' : 'left' })
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.mouse.move(p.x + 25, p.y + 15, { steps: 4 })
    await page.mouse.up({ button: right ? 'right' : 'left' })
  }
}
async function press(page: Page, target: Locator, mobile: boolean) {
  if (mobile) await target.tap()
  else await target.click()
}
async function open(page: Page, target: Locator, mobile: boolean) {
  if (!mobile) { await target.click({ button: 'right' }); return }
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [await center(target)] })
  await expect(page.getByRole('dialog', { name: '味方1の設定' })).toBeVisible()
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
}

test('全体→拡大→駒の上から表示をドラッグ→表示上のマスで移動→全体へ戻る', async ({ page }, info) => {
  const mobile = info.project.name === 'chromium-mobile'
  await prepare(page)
  const initial = await box(viewport(page))
  await expect(page.getByText('倍率 1.0倍')).toBeVisible()
  await press(page, cell(page, 5, 5), mobile)
  await zoom(page, mobile)
  const before = await box(cell(page, 5, 5))
  await drag(page, cell(page, 5, 5), mobile)
  const after = await box(cell(page, 5, 5))
  expect(after.x - before.x).toBeCloseTo(25)
  expect(after.y - before.y).toBeCloseTo(15)
  await expect(cell(page, 5, 5)).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  if (!mobile) {
    await drag(page, cell(page, 5, 5), false, true)
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(cell(page, 5, 5)).toHaveAttribute('aria-pressed', 'true')
  }
  await expect(cell(page, 6, 5)).toHaveAccessibleName(/移動範囲$/)
  await press(page, cell(page, 6, 5), mobile)
  await expect(cell(page, 6, 5)).toHaveAccessibleName(/味方1/)
  await expect(cell(page, 6, 5)).toHaveAttribute('aria-pressed', 'false')
  await press(page, cell(page, 6, 5), mobile)
  await test.step('変換後の駒の近くで設定し、開閉が盤面・一覧を動かさない', async () => {
    const layout = async () => [await box(viewport(page)), await box(page.getByRole('group', { name: '未配置の駒' }))]
    const before = await layout()
    await open(page, cell(page, 6, 5), mobile)
    const popup = await box(page.getByRole('dialog', { name: '味方1の設定' }))
    const piece = await box(cell(page, 6, 5))
    expect(popup.y <= piece.y + piece.height + 16).toBe(true)
    expect(await layout()).toEqual(before)
    await button(page, '倒れた状態にする').click()
    await button(page, '閉じる').click()
    expect(await layout()).toEqual(before)
  })
  await press(page, cell(page, 5, 5), mobile)
  await expect(cell(page, 6, 5)).toHaveAccessibleName(/倒れた状態/)
  await expect(cell(page, 5, 5)).toHaveAttribute('aria-pressed', 'true')
  await button(page, '全体を見る').click()
  await expect(page.getByText('倍率 1.0倍')).toBeVisible()
  await expect(cell(page, 5, 5)).toHaveAttribute('aria-pressed', 'true')
  await expect(cell(page, 6, 5)).toHaveAccessibleName(/倒れた状態/)
  expect(await box(viewport(page))).toEqual(initial)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width)
  await info.attach('全体表示へ復帰', { body: await page.screenshot(), contentType: 'image/png' })
})

test('隠れた駒の設定は設定ボタンの近くに出し、閉じても表示枠をスクロールしない。キーボードでも開ける', async ({ page }) => {
  await prepare(page, 1, 1)
  await cell(page, 1, 1).click()
  await zoom(page, false)
  const hidden = await box(cell(page, 1, 1))
  const frame = await box(viewport(page))
  expect(hidden.x + hidden.width).toBeLessThan(frame.x)
  const settings = button(page, '設定')
  await settings.click()
  const popup = await box(page.getByRole('dialog'))
  const anchor = await box(settings)
  expect(Math.abs(popup.y + popup.height - anchor.y) < 20 || Math.abs(popup.y - anchor.y - anchor.height) < 20).toBe(true)
  await button(page, '閉じる').click()
  expect(await viewport(page).evaluate((el) => ({ x: el.scrollLeft, y: el.scrollTop }))).toEqual({ x: 0, y: 0 })
  await button(page, '全体を見る').click()
  await cell(page, 1, 1).focus()
  await page.keyboard.press('Shift+F10')
  await expect(page.getByRole('dialog', { name: '味方1の設定' })).toBeVisible()
})

test('低いスマホ画面でも長押しを離す操作が設定変更にならず、閉じて表示位置を保つ', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium-mobile', '長押しはタッチで確認')
  await page.setViewportSize({ width: 375, height: 400 })
  await prepare(page)
  await cell(page, 5, 5).scrollIntoViewIfNeeded()
  const before = await box(cell(page, 5, 5))
  await open(page, cell(page, 5, 5), true)
  await expect(page.getByRole('dialog').getByText('状態：通常')).toBeVisible()
  await expect(page.getByRole('dialog').getByRole('status')).toHaveText('5')
  await button(page, '閉じる').click()
  await expect(cell(page, 5, 5)).toHaveAttribute('aria-pressed', 'true')
  expect(await box(cell(page, 5, 5))).toEqual(before)
})
