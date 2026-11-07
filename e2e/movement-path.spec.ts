import { expect, test, type Page } from '@playwright/test'
import { setCount } from './counts.ts'

// #60 他の駒を避ける移動範囲（spec.md 2.3）。座標は表示と同じ1始まりの (横, 縦)。
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true })
const cell = (page: Page, x: number, y: number) => page.getByRole('button', { name: new RegExp(`^マス \\(${x}, ${y}\\)`) })
const token = (page: Page, name: string) => page.getByRole('button', { name: new RegExp(`(?:^未配置 | )${name}（`) })
const range = (page: Page) => page.getByRole('button', { name: / 移動範囲$/ })
const closeSettings = async (page: Page) => {
  await button(page, '閉じる').click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

test('囲まれた駒は目安が出ず、脇の駒を倒れた状態にすると通過した先が出て、範囲外へも移動できる', async ({ page }, testInfo) => {
  await page.goto('/')
  await setCount(page, '味方の数', 1)
  await setCount(page, '敵の数', 2)
  await button(page, '駒を用意する').click()
  for (const [name, x, y] of [['味方1', 1, 1], ['敵1', 2, 1], ['敵2', 1, 2]] as const) {
    await token(page, name).click()
    await cell(page, x, y).click()
    await expect(cell(page, x, y)).toHaveAccessibleName(new RegExp(` ${name}（`))
  }
  await button(page, '確定').click()

  // 通常の駒 (2, 1)・(1, 2) に脇を塞がれ、斜めの (2, 2) へも抜けられない。
  await cell(page, 1, 1).click()
  await expect(cell(page, 1, 1)).toHaveAttribute('aria-pressed', 'true')
  await expect(range(page)).toHaveCount(0)
  await expect(cell(page, 2, 2)).not.toHaveClass(/board-cell-range/)
  await testInfo.attach('囲まれた味方1を選択中', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })

  // 敵1を倒れた状態にすると、敵1を通過した先と斜めの (2, 2) が目安になる。敵1のマス自体は目安にしない。
  await cell(page, 2, 1).click()
  await button(page, '設定').click()
  await button(page, '倒れた状態にする').click()
  await closeSettings(page)
  await cell(page, 1, 1).click()
  await expect(cell(page, 1, 1)).toHaveAttribute('aria-pressed', 'true')
  await expect(cell(page, 2, 2)).toHaveAccessibleName('マス (2, 2) 移動範囲')
  await expect(cell(page, 3, 1)).toHaveAccessibleName('マス (3, 1) 移動範囲')
  await expect(cell(page, 6, 1)).toHaveClass('board-cell board-cell-range')
  await expect(cell(page, 7, 1)).not.toHaveClass(/board-cell-range/)
  await expect(cell(page, 2, 1)).toHaveAccessibleName('マス (2, 1) 敵1（敵・移動力5・倒れた状態）')
  await expect(cell(page, 2, 1)).not.toHaveClass(/board-cell-range/)
  await testInfo.attach('倒れた敵1を通過する目安', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })

  // 範囲外の空きマスへも移動でき、移動後は選択と目安を解除する。
  await cell(page, 9, 9).click()
  await expect(cell(page, 9, 9)).toHaveAccessibleName('マス (9, 9) 味方1（味方・移動力5）')
  await expect(cell(page, 1, 1)).toHaveAccessibleName('マス (1, 1)')
  await expect(page.getByRole('button', { pressed: true })).toHaveCount(0)
  await expect(range(page)).toHaveCount(0)
})
