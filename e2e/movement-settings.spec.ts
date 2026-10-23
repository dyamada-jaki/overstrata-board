import { expect, test, type Page } from '@playwright/test'

const cell = (page: Page, x: number, y: number) => page.getByRole('button', { name: new RegExp(`^マス \\(${x}, ${y}\\)`) })
const token = (page: Page, name: string) => page.getByRole('button', { name: new RegExp(`(?:^未配置 | )${name}（`) })
const editor = (page: Page, name: string) => page.getByRole('group', { name: `${name}の移動力`, exact: true })
async function prepare(page: Page) {
  await page.getByRole('textbox', { name: '味方の数' }).fill('1')
  await page.getByRole('textbox', { name: '敵の数' }).fill('1')
  await page.getByRole('button', { name: '駒を用意する' }).click()
}

async function expectContained(page: Page, name: string) {
  const box = await editor(page, name).boundingBox()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width)
  for (const button of await editor(page, name).getByRole('button').all()) {
    const bounds = await button.boundingBox()
    expect(bounds!.width).toBeGreaterThanOrEqual(44)
    expect(bounds!.height).toBeGreaterThanOrEqual(44)
  }
}

// CSSの式を写さず、対象の駒に接して開き、駒自体を覆わないことを測る。
async function expectNearToken(page: Page, name: string) {
  const control = await editor(page, name).boundingBox()
  const target = await token(page, name).boundingBox()
  const board = await page.getByRole('group', { name: '戦闘盤面' }).boundingBox()
  expect(control!.x).toBeGreaterThanOrEqual(board!.x)
  expect(control!.y).toBeGreaterThanOrEqual(board!.y)
  expect(control!.x + control!.width).toBeLessThanOrEqual(board!.x + board!.width)
  expect(control!.y + control!.height).toBeLessThanOrEqual(board!.y + board!.height)
  const verticalGap = Math.min(
    Math.abs(control!.y - (target!.y + target!.height)),
    Math.abs(control!.y + control!.height - target!.y),
  )
  expect(verticalGap).toBeLessThanOrEqual(2)
  const centerX = target!.x + target!.width / 2
  expect(control!.x).toBeLessThan(centerX)
  expect(control!.x + control!.width).toBeGreaterThan(centerX)
}

test('駒のそばで移動力を設定し、範囲更新・0での自由移動・確定・次の戦闘まで値を扱う', async ({ page }, testInfo) => {
  await page.goto('/')
  await prepare(page)
  await token(page, '味方1').click()
  await expect(editor(page, '味方1').getByRole('status')).toHaveText('5')
  await expectContained(page, '味方1')
  await page.getByRole('button', { name: '味方1の移動力を減らす' }).click()
  await expect(token(page, '味方1')).toHaveAccessibleName('未配置 味方1（味方・移動力4）')
  await expect(token(page, '敵1')).toHaveAccessibleName('未配置 敵1（敵・移動力5）')
  await cell(page, 1, 1).click()
  await token(page, '敵1').click()
  await cell(page, 10, 10).click()
  await cell(page, 1, 1).click()
  await expectContained(page, '味方1')
  await expectNearToken(page, '味方1')
  await expect(cell(page, 6, 1)).toHaveAccessibleName('マス (6, 1)')
  await page.getByRole('button', { name: '味方1の移動力を増やす' }).click()
  await expect(cell(page, 6, 1)).toHaveAccessibleName('マス (6, 1) 移動範囲')
  await expect(cell(page, 1, 1)).toHaveAttribute('aria-pressed', 'true')
  await testInfo.attach('盤面の駒のそばの設定欄', { body: await page.screenshot(), contentType: 'image/png' })
  // 設定欄が覆うマスへは、選択を保ったまま欄だけ閉じて移動する。
  await page.getByRole('button', { name: '移動力の設定を閉じる' }).click()
  await expect(editor(page, '味方1')).toHaveCount(0)
  await expect(cell(page, 1, 1)).toHaveAttribute('aria-pressed', 'true')
  await cell(page, 1, 2).click()
  await expect(cell(page, 1, 2)).toHaveAccessibleName('マス (1, 2) 味方1（味方・移動力5）')
  await cell(page, 1, 2).click()
  for (let i = 0; i < 5; i += 1) await page.getByRole('button', { name: '味方1の移動力を減らす' }).click()
  await expect(page.getByRole('button', { name: '味方1の移動力を減らす' })).toBeDisabled()
  await expect(page.getByRole('button', { name: / 移動範囲$/ })).toHaveCount(0)
  await cell(page, 9, 10).click()
  await expect(cell(page, 9, 10)).toHaveAccessibleName('マス (9, 10) 味方1（味方・移動力0）')
  await cell(page, 10, 10).click()
  for (let i = 0; i < 4; i += 1) await page.getByRole('button', { name: '敵1の移動力を増やす' }).click()
  await expect(page.getByRole('button', { name: '敵1の移動力を増やす' })).toBeDisabled()
  await expectContained(page, '敵1')
  await expectNearToken(page, '敵1')
  await page.getByRole('button', { name: '確定', exact: true }).click()
  await expect(page.getByRole('button', { pressed: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: / 移動範囲$/ })).toHaveCount(0)
  await cell(page, 9, 10).click()
  await expect(page.getByRole('button', { name: /の移動力を/ })).toHaveCount(0)
  await cell(page, 1, 1).click()
  await expect(cell(page, 1, 1)).toHaveAccessibleName('マス (1, 1) 味方1（味方・移動力0）')
  await expect(cell(page, 10, 10)).toHaveAccessibleName('マス (10, 10) 敵1（敵・移動力9）')
  await page.getByRole('button', { name: '新しい戦闘を始める' }).click()
  await page.getByRole('button', { name: 'キャンセル', exact: true }).click()
  await expect(cell(page, 1, 1)).toHaveAccessibleName('マス (1, 1) 味方1（味方・移動力0）')
  await page.getByRole('button', { name: '新しい戦闘を始める' }).click()
  await page.getByRole('button', { name: '始める', exact: true }).click()
  await prepare(page)
  await token(page, '味方1').click()
  await expect(editor(page, '味方1').getByRole('status')).toHaveText('5')
  await expect(token(page, '敵1')).toHaveAccessibleName('未配置 敵1（敵・移動力5）')
})
