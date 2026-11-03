import { expect, test, type Locator, type Page } from '@playwright/test'
import { setCount } from './counts.ts'

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true })
const output = (page: Page, name: string) => page.getByRole('status', { name, exact: true })
const bounds = (element: Locator) => element.evaluate((el) => {
  const { x, y, width, height } = el.getBoundingClientRect()
  return { x, y, width, height }
})

// 値の直接入力をやめた後も、文字入力へ移らず通常のTab順とボタンの標準操作を使える。
test('数値は表示専用で、±の無効化後もTabで有効な部品へ進み、キーボードで準備と追加ができる', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('body')).toBeFocused()
  await expect(page.locator('input, textarea, [contenteditable="true"], [aria-invalid], .input-error')).toHaveCount(0)
  const allyPlus = button(page, '味方の数を増やす')
  const allyMinus = button(page, '味方の数を減らす')
  await allyPlus.focus()
  await page.keyboard.press('Space')
  await expect(output(page, '味方の数')).toHaveText('1')
  await page.keyboard.press('Shift+Tab') // 表示専用の数値はTab順に入らない
  await expect(allyMinus).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(output(page, '味方の数')).toHaveText('0')
  await expect(allyMinus).toBeDisabled()
  await expect(page.locator('body')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(allyPlus).toBeFocused()
  for (let i = 0; i < 10; i += 1) await page.keyboard.press('Enter')
  await expect(output(page, '味方の数')).toHaveText('10')
  await expect(allyPlus).toBeDisabled()
  await expect(page.locator('body')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(button(page, '敵の数を増やす')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(button(page, '駒を用意する')).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('group', { name: '未配置の駒' }).getByRole('button')).toHaveCount(10)
  await button(page, '駒を増やす').click()
  // 同時上限で味方の±は両方disabled。Tabで入力対象や無効なボタンを経由しない。
  await expect(button(page, '味方の追加数を減らす')).toBeDisabled()
  await expect(button(page, '味方の追加数を増やす')).toBeDisabled()
  const enemyPlus = button(page, '敵の追加数を増やす')
  const enemyMinus = button(page, '敵の追加数を減らす')
  await enemyPlus.focus()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Shift+Tab')
  await expect(enemyMinus).toBeFocused()
  await page.keyboard.press('Space')
  await expect(enemyMinus).toBeDisabled()
  await expect(page.locator('body')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(enemyPlus).toBeFocused()
  for (let i = 0; i < 10; i += 1) await page.keyboard.press('Enter')
  await expect(enemyPlus).toBeDisabled()
  await expect(page.locator('body')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(button(page, 'キャンセル')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(button(page, '追加する')).toBeFocused()
  await page.keyboard.press('Space')
  await expect(page.getByRole('group', { name: '駒の追加数' })).toHaveCount(0)
  await expect(page.locator('body')).toBeFocused()
  await expect(page.getByRole('group', { name: '未配置の駒' }).getByRole('button')).toHaveCount(20)
  await expect(page.locator('input, [contenteditable="true"], [aria-invalid], .input-error')).toHaveCount(0)
})

test('開始と追加の0/1案内・9/10の桁数で±の位置とパネルの高さが変わらない', async ({ page }, testInfo) => {
  await page.goto('/')
  for (const adding of [false, true]) {
    const panel = adding ? page.getByRole('group', { name: '駒の追加数' }) : page.getByRole('region', { name: '駒の数の指定' })
    const name = adding ? '敵の追加数' : '味方の数'
    const plus = button(page, `${name}を増やす`)
    const minus = button(page, `${name}を減らす`)
    const guidance = panel.getByText('味方か敵を1体以上にしてください')
    await plus.scrollIntoViewIfNeeded()
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    const before = { plus: await bounds(plus), minus: await bounds(minus), panel: await bounds(panel), guide: await bounds(guidance) }
    for (const value of ['1', '0', '9', '10', '9']) {
      await setCount(page, name, value)
      expect(await bounds(plus)).toEqual(before.plus)
      expect(await bounds(minus)).toEqual(before.minus)
      expect(await bounds(panel)).toEqual(before.panel)
      expect(await bounds(guidance)).toEqual(before.guide)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width)
    }
    await testInfo.attach(adding ? '追加数の表示専用操作' : '最初の数の表示専用操作', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    if (!adding) {
      await setCount(page, name, '1')
      await button(page, '駒を用意する').click()
      await button(page, '駒を増やす').click()
    }
  }
})
