import { expect, test, type Page } from '@playwright/test'

// キャラのいるマスは「マス (横, 縦) 名前（陣営・装備）」、移動範囲は末尾に「移動範囲」を持つ。
const character = (page: Page, name: string) =>
  page.getByRole('button', { name: new RegExp(` ${name}（`) })
const pressed = (page: Page) => page.getByRole('button', { pressed: true })
const range = (page: Page) => page.getByRole('button', { name: / 移動範囲$/ })

test('キャラを選択→範囲表示→別キャラで切替→範囲内外へ移動→解除できる', async ({ page }, testInfo) => {
  await page.goto('/')
  const ally1 = character(page, '味方1')
  const ally2 = character(page, '味方2')
  const enemy1 = character(page, '敵1')
  const enemy2 = character(page, '敵2')
  await expect(ally1).toHaveAccessibleName('マス (3, 8) 味方1（味方・軽装）')
  await expect(ally2).toHaveAccessibleName('マス (6, 9) 味方2（味方・重装）')
  await expect(enemy1).toHaveAccessibleName('マス (4, 3) 敵1（敵・中装）')
  await expect(enemy2).toHaveAccessibleName('マス (7, 2) 敵2（敵・軽装）')
  for (const token of [ally1, ally2, enemy1, enemy2]) {
    await expect(token).toBeInViewport({ ratio: 1 })
  }
  // 味方と敵のコマは色で見分けられる。
  const colorOf = (name: string) => page.getByText(name, { exact: true })
    .evaluate((element) => getComputedStyle(element).backgroundColor)
  expect(await colorOf('味方1')).toBe(await colorOf('味方2'))
  expect(await colorOf('敵1')).toBe(await colorOf('敵2'))
  expect(await colorOf('味方1')).not.toBe(await colorOf('敵1'))

  // 味方1を選ぶと、距離5でも敵1のマスを除いた範囲が出る。
  await ally1.click()
  await expect(pressed(page)).toHaveCount(1)
  await expect(ally1).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'マス (3, 3) 移動範囲', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'マス (3, 2)', exact: true })).toBeVisible()
  // 範囲は薄い色で塗り、範囲外のマスと見分けられる。
  const backgroundOf = (name: string) => page.getByRole('button', { name, exact: true })
    .evaluate((element) => getComputedStyle(element).backgroundColor)
  expect(await backgroundOf('マス (3, 3) 移動範囲')).not.toBe(await backgroundOf('マス (3, 2)'))
  await expect(enemy1).toHaveAccessibleName('マス (4, 3) 敵1（敵・中装）')
  await testInfo.attach('味方1の移動範囲', { body: await page.screenshot(), contentType: 'image/png' })

  // 別キャラを押しても誰も動かず、選択と範囲だけが敵1へ切り替わる。
  await enemy1.click()
  await expect(enemy1).toHaveAttribute('aria-pressed', 'true')
  await expect(pressed(page)).toHaveCount(1)
  await expect(ally1).toHaveAccessibleName('マス (3, 8) 味方1（味方・軽装）')
  await expect(enemy1).toHaveAccessibleName('マス (4, 3) 敵1（敵・中装）')
  await expect(page.getByRole('button', { name: 'マス (4, 1) 移動範囲', exact: true })).toBeVisible()

  // 範囲内の空きマス (3, 4) へ移動すると、選択と範囲が消える。
  await ally1.click()
  await page.getByRole('button', { name: 'マス (3, 4) 移動範囲', exact: true }).click()
  await expect(ally1).toHaveAccessibleName('マス (3, 4) 味方1（味方・軽装）')
  await expect(pressed(page)).toHaveCount(0)
  await expect(range(page)).toHaveCount(0)

  // 余白を押しても選択は変わらず、範囲外の空きマス (1, 1) にも移動できる。
  await ally2.click()
  await page.getByRole('main').click({ position: { x: 4, y: 4 } })
  await expect(ally2).toHaveAttribute('aria-pressed', 'true')
  await expect(range(page).first()).toBeVisible()
  await page.getByRole('button', { name: 'マス (1, 1)', exact: true }).click()
  await expect(ally2).toHaveAccessibleName('マス (1, 1) 味方2（味方・重装）')
  await expect(pressed(page)).toHaveCount(0)
  await expect(range(page)).toHaveCount(0)

  // 選択中のキャラを再タップすると、位置を変えず解除する。
  await ally2.click()
  await expect(ally2).toHaveAttribute('aria-pressed', 'true')
  await ally2.click()
  await expect(ally2).toHaveAccessibleName('マス (1, 1) 味方2（味方・重装）')
  await expect(pressed(page)).toHaveCount(0)
  await expect(range(page)).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  )
})
