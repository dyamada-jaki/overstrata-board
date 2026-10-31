import { expect, test, type Page } from '@playwright/test'

const cell = (page: Page, x: number, y: number) => page.getByRole('button', { name: new RegExp(`^マス \\(${x}, ${y}\\)`) })
const token = (page: Page, name: string) => page.getByRole('button', { name: new RegExp(`(?:^未配置 | )${name}（`) })
const pressed = (page: Page) => page.getByRole('button', { pressed: true })
const range = (page: Page) => page.getByRole('button', { name: / 移動範囲$/ })
// #45 で選択中の駒の設定はポップアップへ移った。「設定」で開き、背後を操作する前に「×」で閉じる。
const openSettings = (page: Page) => page.getByRole('button', { name: '設定', exact: true }).click()
const closeSettings = async (page: Page) => {
  await page.getByRole('button', { name: '閉じる', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}
async function prepare(page: Page, ally: string, enemy: string) {
  await page.getByRole('textbox', { name: '味方の数' }).fill(ally)
  await page.getByRole('textbox', { name: '敵の数' }).fill(enemy)
  await page.getByRole('button', { name: '駒を用意する' }).click()
}
async function place(page: Page, name: string, x: number, y: number) {
  await token(page, name).click()
  await cell(page, x, y).click()
}
async function confirmReset(page: Page, button: string, accept: boolean) {
  await page.getByRole('button', { name: button }).click()
  const dialog = page.getByRole('dialog', { name: button })
  await expect(dialog.getByRole('button', { name: 'キャンセル' })).toBeFocused()
  await dialog.getByRole('button', { name: accept ? (button === '準備をやり直す' ? 'やり直す' : '始める') : 'キャンセル', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  if (accept) await expect(page.getByRole('textbox', { name: '味方の数' })).toBeFocused()
}

test('数指定→配置と選択切替→確定→範囲内外の移動→新戦闘→再準備まで使える', async ({ page }, testInfo) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: '駒を用意する' })).toBeDisabled()
  await page.getByRole('button', { name: '味方の数を増やす' }).click()
  await expect(page.getByRole('textbox', { name: '味方の数' })).toHaveValue('1')
  await page.getByRole('textbox', { name: '敵の数' }).fill('11')
  await expect(page.getByText('0〜10の整数で入力してください')).toBeVisible()
  await expect(page.getByRole('button', { name: '駒を用意する' })).toBeDisabled()
  await prepare(page, '1', '1')
  await expect(page.getByRole('button', { name: '確定', exact: true })).toBeDisabled()
  await token(page, '味方1').click()
  await token(page, '味方1').click()
  await expect(pressed(page)).toHaveCount(0)
  await place(page, '味方1', 1, 1)
  await expect(pressed(page)).toHaveCount(0)
  await token(page, '敵1').click()
  await cell(page, 1, 1).click()
  await expect(cell(page, 1, 1)).toHaveAttribute('aria-pressed', 'true')
  await expect(token(page, '敵1')).toHaveAccessibleName('未配置 敵1（敵・移動力5）')
  await expect(cell(page, 6, 1)).toHaveAccessibleName('マス (6, 1) 移動範囲')
  await expect(cell(page, 7, 1)).toHaveAccessibleName('マス (7, 1)')
  await confirmReset(page, '準備をやり直す', false)
  await expect(cell(page, 1, 1)).toHaveAttribute('aria-pressed', 'true')
  await expect(token(page, '敵1')).toBeVisible()
  await place(page, '敵1', 2, 1)
  await expect(page.getByRole('button', { name: '確定', exact: true })).toBeEnabled()
  await cell(page, 1, 1).click()
  await expect(cell(page, 2, 1)).toHaveAccessibleName('マス (2, 1) 敵1（敵・移動力5）')
  const background = (x: number, y: number) => cell(page, x, y).evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(await background(6, 1)).not.toBe(await background(7, 1))
  await testInfo.attach('準備中の選択と移動範囲', { body: await page.screenshot(), contentType: 'image/png' })
  await page.getByRole('button', { name: '確定', exact: true }).click()
  await expect(pressed(page)).toHaveCount(0)
  await expect(range(page)).toHaveCount(0)
  await cell(page, 1, 1).click()
  await cell(page, 6, 1).click()
  await expect(cell(page, 6, 1)).toHaveAccessibleName('マス (6, 1) 味方1（味方・移動力5）')
  await expect(pressed(page)).toHaveCount(0)
  await cell(page, 6, 1).click()
  await page.getByRole('main').click({ position: { x: 4, y: 4 } })
  await expect(cell(page, 6, 1)).toHaveAttribute('aria-pressed', 'true')
  await cell(page, 10, 10).click()
  await expect(cell(page, 10, 10)).toHaveAccessibleName('マス (10, 10) 味方1（味方・移動力5）')
  await cell(page, 10, 10).click()
  await cell(page, 2, 1).click()
  await expect(pressed(page)).toHaveCount(1)
  await expect(cell(page, 2, 1)).toHaveAttribute('aria-pressed', 'true')
  await cell(page, 2, 1).click()
  await expect(pressed(page)).toHaveCount(0)
  await cell(page, 10, 10).click()
  await confirmReset(page, '新しい戦闘を始める', false)
  await expect(cell(page, 10, 10)).toHaveAttribute('aria-pressed', 'true')
  await expect(range(page).first()).toBeVisible()
  await confirmReset(page, '新しい戦闘を始める', true)
  await expect(page.getByRole('textbox', { name: '味方の数' })).toHaveValue('0')
  await expect(page.getByRole('textbox', { name: '敵の数' })).toHaveValue('0')
  await expect(pressed(page)).toHaveCount(0)
  await expect(range(page)).toHaveCount(0)
  await prepare(page, '0', '1')
  await place(page, '敵1', 5, 5)
  await page.getByRole('button', { name: '確定', exact: true }).click()
  await expect(page.getByRole('button', { name: '新しい戦闘を始める' })).toBeVisible()
})

test('準備中に選んだ駒の移動力を±で変えると範囲がすぐ変わり、0でも移動でき、確定後は変更欄が出ない', async ({ page }, testInfo) => {
  await page.goto('/')
  await prepare(page, '1', '1')
  await place(page, '味方1', 1, 1)
  await place(page, '敵1', 2, 1)
  await cell(page, 1, 1).click()
  await openSettings(page)
  const setting = page.getByRole('group', { name: '味方1の移動力' })
  await expect(setting.getByRole('status')).toHaveText('5')
  await expect(cell(page, 7, 1)).toHaveAccessibleName('マス (7, 1)')
  await setting.getByRole('button', { name: '味方1の移動力を増やす' }).click()
  await expect(setting.getByRole('status')).toHaveText('6')
  await expect(cell(page, 7, 1)).toHaveAccessibleName('マス (7, 1) 移動範囲')
  await expect(cell(page, 1, 1)).toHaveAccessibleName('マス (1, 1) 味方1（味方・移動力6）')
  await expect(cell(page, 2, 1)).toHaveAccessibleName('マス (2, 1) 敵1（敵・移動力5）')
  await expect(cell(page, 1, 1)).toHaveAttribute('aria-pressed', 'true')
  await testInfo.attach('移動力の変更欄と範囲', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
  const minus = setting.getByRole('button', { name: '味方1の移動力を減らす' })
  for (let value = 5; value >= 0; value -= 1) {
    await minus.click()
    await expect(setting.getByRole('status')).toHaveText(String(value))
  }
  await expect(minus).toBeDisabled()
  await expect(range(page)).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width)
  await closeSettings(page)
  await cell(page, 10, 10).click()
  await expect(cell(page, 10, 10)).toHaveAccessibleName('マス (10, 10) 味方1（味方・移動力0）')
  await page.getByRole('button', { name: '確定', exact: true }).click()
  await cell(page, 10, 10).click()
  await expect(cell(page, 10, 10)).toHaveAttribute('aria-pressed', 'true')
  await openSettings(page)
  await expect(page.getByRole('group', { name: /の移動力$/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /の移動力を(?:増や|減ら)す$/ })).toHaveCount(0)
})

test('20体の一覧と番号10を表示し、陣営色が異なり横スクロールも発生しない', async ({ page }, testInfo) => {
  await page.goto('/')
  await prepare(page, '10', '10')
  await expect(page.getByRole('group', { name: '未配置の駒' }).getByRole('button')).toHaveCount(20)
  expect(await token(page, '味方1').locator('.board-token').evaluate((el) => getComputedStyle(el).backgroundColor))
    .not.toBe(await token(page, '敵1').locator('.board-token').evaluate((el) => getComputedStyle(el).backgroundColor))
  const buttons = page.getByRole('group', { name: '未配置の駒' }).getByRole('button')
  const bounds = await buttons.evaluateAll((els) => els.map((el) => {
    const { x, y, width, height } = el.getBoundingClientRect()
    return { x, y, width, height }
  }))
  for (const box of bounds) {
    expect(box.width).toBeGreaterThanOrEqual(44)
    expect(box.height).toBeGreaterThanOrEqual(44)
  }
  expect(Math.max(...bounds.slice(0, 10).map((box) => box.y + box.height))).toBeLessThanOrEqual(bounds[10]!.y)
  expect(await buttons.allTextContents()).toEqual([
    ...Array.from({ length: 10 }, (_, i) => `${i + 1}味方${i + 1}`),
    ...Array.from({ length: 10 }, (_, i) => `${i + 1}敵${i + 1}`),
  ])
  const board = await page.getByRole('group', { name: '戦闘盤面' }).boundingBox()
  const panel = await page.getByRole('region', { name: '配置の準備' }).boundingBox()
  if (page.viewportSize()!.width >= 1024) {
    expect(panel!.x).toBeGreaterThanOrEqual(board!.x + board!.width)
    expect(board!.y + board!.height).toBeLessThanOrEqual(720)
    expect(panel!.y + panel!.height).toBeLessThanOrEqual(720)
  } else {
    expect(panel!.y).toBeGreaterThanOrEqual(board!.y + board!.height)
  }
  await place(page, '味方10', 1, 1)
  await place(page, '敵10', 10, 10)
  const ally = cell(page, 1, 1).locator('span')
  const enemy = cell(page, 10, 10).locator('span')
  await expect(ally).toHaveText('10')
  await expect(enemy).toHaveText('10')
  expect(await ally.evaluate((el) => getComputedStyle(el).backgroundColor))
    .not.toBe(await enemy.evaluate((el) => getComputedStyle(el).backgroundColor))
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width)
  await testInfo.attach('番号10と未配置一覧', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
  await confirmReset(page, '準備をやり直す', true)
  await expect(page.getByRole('textbox', { name: '味方の数' })).toHaveValue('0')
  await expect(page.getByRole('button', { name: /^マス .*（/ })).toHaveCount(0)
})

// #39 で見つかった Shift+Tab → 背後の確定 → Enter の回帰を実ブラウザで防ぐ。
test('確認中のキーボードとポインターは背後へ届かず、取消・Escで段階と選択を保つ', async ({ page }) => {
  await page.goto('/')
  await prepare(page, '1', '0')
  await place(page, '味方1', 3, 4)
  await cell(page, 3, 4).click()
  const originalRange = await range(page).count()
  for (const phase of ['preparing', 'active']) {
    const opener = page.getByRole('button', { name: phase === 'preparing' ? '準備をやり直す' : '新しい戦闘を始める' })
    for (const cancel of ['キャンセル', 'Escape']) {
      await opener.click()
      const dialog = page.getByRole('dialog')
      await expect(dialog.getByRole('button', { name: 'キャンセル' })).toBeFocused()
      await expect(dialog).toHaveJSProperty('open', true)
      // show() や open 属性だけではモーダルにも inert にもならない。
      expect(await dialog.evaluate((el) => el.matches(':modal'))).toBe(true)
      for (const [key, action] of [
        ['Shift+Tab', phase === 'preparing' ? 'やり直す' : '始める'], ['Shift+Tab', 'キャンセル'],
        ['Tab', phase === 'preparing' ? 'やり直す' : '始める'], ['Tab', 'キャンセル'],
        ['Tab', phase === 'preparing' ? 'やり直す' : '始める'],
      ]) {
        await page.keyboard.press(key!)
        await expect(dialog.getByRole('button', { name: action, exact: true })).toBeFocused()
        expect(await page.evaluate(() => {
          const focused = document.activeElement
          return focused === document.body || !!focused?.closest('dialog')
        })).toBe(true)
      }
      // 背後の盤面位置を実座標でクリックしても、駒を移動できない。
      const boardCell = await cell(page, 10, 10).boundingBox()
      await page.mouse.click(boardCell!.x + boardCell!.width / 2, boardCell!.y + boardCell!.height / 2)
      await expect(dialog).toBeVisible()
      await expect(cell(page, 3, 4)).toHaveAttribute('aria-pressed', 'true')
      if (cancel === 'Escape') await page.keyboard.press('Escape')
      else await dialog.getByRole('button', { name: 'キャンセル' }).click()
      await expect(dialog).not.toBeVisible()
      await expect(opener).toBeFocused()
      await expect(cell(page, 3, 4)).toHaveAccessibleName('マス (3, 4) 味方1（味方・移動力5）')
      await expect(cell(page, 3, 4)).toHaveAttribute('aria-pressed', 'true')
      await expect(range(page)).toHaveCount(originalRange)
      await expect(page.getByRole('region', { name: phase === 'preparing' ? '配置の準備' : '戦闘中' })).toBeVisible()
    }
    if (phase === 'preparing') {
      // 最も近い背後の操作は「確定」。逆方向へ回って Enter を押しても確定しない。
      await opener.click()
      await page.keyboard.press('Shift+Tab')
      await page.keyboard.press('Shift+Tab')
      await page.keyboard.press('Enter')
      await expect(page.getByRole('dialog')).not.toBeVisible()
      await expect(opener).toBeVisible()
      await expect(cell(page, 3, 4)).toHaveAttribute('aria-pressed', 'true')
      await page.getByRole('button', { name: '確定', exact: true }).click()
      await cell(page, 3, 4).click()
    }
  }
})
