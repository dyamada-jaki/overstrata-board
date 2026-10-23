import { expect, test, type Page } from '@playwright/test'

const cell = (page: Page, label: string) => page.getByRole('button', { name: `マス ${label}`, exact: true })
const occupied = (page: Page) => page.getByRole('button', { name: /^マス .*（/ })
const pressed = (page: Page) => page.getByRole('button', { pressed: true })
const range = (page: Page) => page.getByRole('button', { name: / 移動範囲$/ })

async function expectInitialScreen(page: Page) {
  await expect(page.getByRole('button', { name: /^マス / })).toHaveCount(100)
  await expect(occupied(page)).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: '味方の数' })).toHaveValue('0')
  await expect(page.getByRole('textbox', { name: '敵の数' })).toHaveValue('0')
  await expect(page.getByRole('button', { name: '駒を用意する' })).toBeDisabled()
  await expect(page.getByRole('region', { name: '未配置の駒' })).toHaveCount(0)
  await expect(pressed(page)).toHaveCount(0)
  await expect(range(page)).toHaveCount(0)
}

async function expectNoHorizontalScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  )
}

test('20体を用意・配置し、やり直し・確定・新しい戦闘を通して使える', async ({ page }, testInfo) => {
  await page.goto('/')
  await expectInitialScreen(page)
  await expect(page.getByText('味方か敵を1体以上にしてください')).toBeVisible()

  // 不正な数では用意できず、欄の下に案内する。
  const ally = page.getByRole('textbox', { name: '味方の数' })
  const enemy = page.getByRole('textbox', { name: '敵の数' })
  await ally.fill('11')
  await enemy.fill('1')
  await expect(page.getByText('0〜10の整数で入力してください')).toBeVisible()
  await expect(page.getByRole('button', { name: '駒を用意する' })).toBeDisabled()

  // 双方10体で20体が一覧に並び、横スクロールしない。
  await ally.fill('10')
  await enemy.fill('10')
  await page.getByRole('button', { name: '駒を用意する' }).click()
  const list = page.getByRole('region', { name: '未配置の駒' })
  await expect(list.getByRole('button')).toHaveCount(20)
  // 一覧は縦に折り返し、どの駒も横にはみ出さない。
  for (const button of await list.getByRole('button').all()) {
    const box = (await button.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width)
  }
  await expectNoHorizontalScroll(page)
  await testInfo.attach('20体の未配置一覧', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })

  // 10番の駒は盤面でも「10」と読める。
  await list.getByRole('button', { name: '味方10', exact: true }).click()
  await cell(page, '(1, 1)').click()
  const ally10 = page.getByRole('button', { name: 'マス (1, 1) 味方10（味方）', exact: true })
  await expect(ally10).toHaveText('10')
  await expect(list.getByRole('button')).toHaveCount(19)
  await expect(page.getByRole('button', { name: '確定', exact: true })).toBeDisabled()

  // 準備をやり直す: 取り消すと保ち、実行すると最初の準備画面へ戻る。
  await page.getByRole('button', { name: '準備をやり直す' }).click()
  const dialog = page.getByRole('alertdialog', { name: '準備をやり直す' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'キャンセル' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(ally10).toBeVisible()
  await expect(list.getByRole('button')).toHaveCount(19)
  await page.getByRole('button', { name: '準備をやり直す' }).click()
  await dialog.getByRole('button', { name: 'やり直す', exact: true }).click()
  await expectInitialScreen(page)

  // 用意・配置して確定し、確定後も動かせる。
  await page.getByRole('button', { name: '味方の数を増やす' }).click()
  await page.getByRole('button', { name: '敵の数を増やす' }).click()
  await page.getByRole('button', { name: '駒を用意する' }).click()
  await list.getByRole('button', { name: '味方1', exact: true }).click()
  await cell(page, '(2, 9)').click()
  await list.getByRole('button', { name: '敵1', exact: true }).click()
  await cell(page, '(9, 2)').click()
  await expect(page.getByText('すべて配置しました。「確定」を押すと準備が完了します。')).toBeVisible()
  await page.getByRole('button', { name: '確定', exact: true }).click()
  await expect(page.getByRole('button', { name: '新しい戦闘を始める' })).toBeVisible()
  await page.getByRole('button', { name: 'マス (2, 9) 味方1（味方）', exact: true }).click()
  await expect(range(page).first()).toBeVisible()
  await page.getByRole('button', { name: 'マス (2, 4) 移動範囲', exact: true }).click()
  await expect(page.getByRole('button', { name: 'マス (2, 4) 味方1（味方）', exact: true })).toBeVisible()
  await expectNoHorizontalScroll(page)

  // 新しい戦闘を始める: 確認して実行すると、最初の準備画面へ戻る。
  await page.getByRole('button', { name: '新しい戦闘を始める' }).click()
  const next = page.getByRole('alertdialog', { name: '新しい戦闘を始める' })
  await next.getByRole('button', { name: 'キャンセル' }).click()
  await expect(occupied(page)).toHaveCount(2)
  await page.getByRole('button', { name: '新しい戦闘を始める' }).click()
  await next.getByRole('button', { name: '始める', exact: true }).click()
  await expectInitialScreen(page)
})
