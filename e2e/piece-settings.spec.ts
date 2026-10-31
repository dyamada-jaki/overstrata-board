import { expect, test, type Locator, type Page } from '@playwright/test'

// #45: 操作中の部品の位置と、駒の設定ポップアップ（長押し・右クリック・外側で閉じる）を実ブラウザで確かめる。
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true })
const cell = (page: Page, x: number, y: number) => page.getByRole('button', { name: new RegExp(`^マス \\(${x}, ${y}\\)`) })
const token = (page: Page, name: string) => page.getByRole('button', { name: new RegExp(`(?:^未配置 | )${name}（`) })
const popup = (page: Page, name: string) => page.getByRole('dialog', { name: `${name}の設定` })
const guidance = (page: Page) => page.getByText('味方か敵を1体以上にしてください')
const isMobile = (projectName: string) => projectName === 'chromium-mobile'
const scrollToBottom = (page: Page) => page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
const scrollY = (page: Page) => page.evaluate(() => window.scrollY)
async function box(locator: Locator) {
  const result = await locator.boundingBox()
  if (!result) throw new Error('要素が表示されていません')
  return result
}
async function center(locator: Locator) {
  const { x, y, width, height } = await box(locator)
  return { x: x + width / 2, y: y + height / 2 }
}
async function prepare(page: Page, ally: string, enemy: string) {
  await page.getByRole('textbox', { name: '味方の数' }).fill(ally)
  await page.getByRole('textbox', { name: '敵の数' }).fill(enemy)
  await button(page, '駒を用意する').click()
}
async function place(page: Page, name: string, x: number, y: number) {
  await token(page, name).click()
  await cell(page, x, y).click()
}
/** 押した位置で、操作した部品の画面上の y 座標とスクロール位置が変わらないこと。 */
async function expectStays(page: Page, target: Locator, act: () => Promise<void>) {
  const before = { y: (await box(target)).y, scroll: await scrollY(page) }
  await act()
  expect({ y: (await box(target)).y, scroll: await scrollY(page) }).toEqual(before)
}
/** スマホは CDP のタッチで長押し、PC は右クリックで開く。開くまで指を離さない。 */
async function openByGesture(page: Page, target: Locator, projectName: string) {
  if (!isMobile(projectName)) {
    await target.click({ button: 'right' })
    return
  }
  const { x, y } = await center(target)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  await expect(page.getByRole('dialog')).toBeVisible()
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
}
/** ポップアップの外側を押す。locator の click は backdrop に遮られるため座標で押す。 */
async function pressAt(page: Page, point: { x: number; y: number }, projectName: string) {
  if (isMobile(projectName)) await page.touchscreen.tap(point.x, point.y)
  else await page.mouse.click(point.x, point.y)
}
async function expectInViewport(page: Page, locator: Locator) {
  const { x, y, width, height } = await box(locator)
  const viewport = page.viewportSize()!
  expect(x).toBeGreaterThanOrEqual(0)
  expect(y).toBeGreaterThanOrEqual(0)
  expect(x + width).toBeLessThanOrEqual(viewport.width)
  expect(y + height).toBeLessThanOrEqual(viewport.height)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
}

test('場面1：画面下端までスクロールして0→1にしても、「＋」の位置を保って続けて増減できる', async ({ page }) => {
  await page.goto('/')
  await scrollToBottom(page)
  await expect(guidance(page)).toBeVisible()
  const plus = button(page, '味方の数を増やす')
  const minus = button(page, '味方の数を減らす')
  await expectStays(page, plus, () => plus.click())
  await expect(guidance(page)).toBeHidden()
  await expectStays(page, plus, () => plus.click())
  await expectStays(page, minus, () => minus.click())
  await expectStays(page, minus, () => minus.click())
  await expect(guidance(page)).toBeVisible()
  await expect(page.getByRole('textbox', { name: '味方の数' })).toHaveValue('0')
})

test('追加数のエリアでも、下端で0→1にして「＋」の位置を保つ（受け入れ条件8でPOと確定）', async ({ page }) => {
  await page.goto('/')
  await prepare(page, '0', '1')
  await button(page, '駒を増やす').click()
  await scrollToBottom(page)
  const plus = button(page, '敵の追加数を増やす')
  await expectStays(page, plus, () => plus.click())
  await expect(page.getByRole('group', { name: '駒の追加数' }).getByText('味方か敵を1体以上にしてください')).toBeHidden()
})

test('場面2：未配置の駒の選択・切り替え・解除で設定を開かず、選んだ駒の位置を保つ', async ({ page }) => {
  await page.goto('/')
  await prepare(page, '2', '1')
  await scrollToBottom(page)
  await expect(button(page, '設定')).toBeDisabled()
  await expectStays(page, token(page, '味方1'), () => token(page, '味方1').click())
  await expect(token(page, '味方1')).toHaveAttribute('aria-pressed', 'true')
  await expect(button(page, '設定')).toBeEnabled()
  await expectStays(page, token(page, '敵1'), () => token(page, '敵1').click())
  await expectStays(page, token(page, '敵1'), () => token(page, '敵1').click())
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(button(page, '設定')).toBeDisabled()
})

test('長押し／右クリックで駒を選んで近くに開き、盤面と一覧を押し下げない。画面端でも画面内に収まる', async ({ page }, testInfo) => {
  await page.goto('/')
  await prepare(page, '3', '1')
  await place(page, '味方1', 1, 1)
  await place(page, '味方2', 10, 10)
  const board = page.getByRole('group', { name: '戦闘盤面' })
  const list = page.getByRole('group', { name: '未配置の駒' })
  const layout = async () => [(await box(board)).y, (await box(list)).y, await scrollY(page)]

  for (const [name, target] of [['味方1', cell(page, 1, 1)], ['味方2', cell(page, 10, 10)], ['味方3', token(page, '味方3')]] as const) {
    await target.scrollIntoViewIfNeeded()
    const before = await layout()
    await openByGesture(page, target, testInfo.project.name)
    await expect(popup(page, name)).toBeVisible()
    await expect(target).toHaveAttribute('aria-pressed', 'true')
    expect(await layout()).toEqual(before)
    await expectInViewport(page, popup(page, name))
    await testInfo.attach(`${name}の設定ポップアップ`, { body: await page.screenshot(), contentType: 'image/png' })
    await button(page, '閉じる').click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(target).toHaveAttribute('aria-pressed', 'true')
    expect(await layout()).toEqual(before)
  }

  // 選択中の同じ駒は選択を保ったまま開く（長押し後の指を離す操作で解除しない）。
  await openByGesture(page, token(page, '味方3'), testInfo.project.name)
  await expect(popup(page, '味方3')).toBeVisible()
  await expect(token(page, '味方3')).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Escape')
  await expect(token(page, '味方3')).toHaveAttribute('aria-pressed', 'true')
  await expect(token(page, '味方3')).toBeFocused()
})

test('スマホ：指を動かしてスクロールし始めると長押しを取り消し、通常のタップでも開かない', async ({ page }, testInfo) => {
  test.skip(!isMobile(testInfo.project.name), 'タッチの長押しはスマホ幅で確かめる')
  await page.goto('/')
  await prepare(page, '1', '1')
  const target = token(page, '味方1')
  await target.scrollIntoViewIfNeeded()
  const { x, y } = await center(target)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  for (let step = 1; step <= 6; step += 1) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - step * 8 }] })
  }
  // 長押しの判定時間（500ms）を超えて指を置いたままにする。保持時間は入力そのものなので固定時間で待つ。
  await page.waitForTimeout(800)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await target.scrollIntoViewIfNeeded()
  await target.tap()
  await expect(target).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('外側のタップ／クリックは閉じるだけで、駒の移動・マスの選択・他の操作部品の動作をしない', async ({ page }, testInfo) => {
  await page.goto('/')
  await prepare(page, '1', '0')
  await place(page, '味方1', 1, 1)
  await cell(page, 1, 1).click()
  await page.evaluate(() => window.scrollTo(0, 0))
  await openByGesture(page, cell(page, 1, 1), testInfo.project.name)
  const dialog = popup(page, '味方1')
  await expect(dialog).toBeVisible()
  await expect(button(page, '閉じる')).toBeFocused()
  // ポップアップから離れた、画面内の空きマス（盤面の右上）を外側として押す。
  const target = cell(page, 10, 1)
  const point = await center(target)
  const area = await box(dialog)
  expect(point.x < area.x || point.x > area.x + area.width || point.y < area.y || point.y > area.y + area.height).toBe(true)
  await pressAt(page, point, testInfo.project.name)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(target).toHaveAttribute('aria-pressed', 'false')
  await expect(target).toHaveAccessibleName('マス (10, 1)')
  await expect(cell(page, 1, 1)).toHaveAccessibleName(/^マス \(1, 1\) 味方1（/)
  await expect(cell(page, 1, 1)).toHaveAttribute('aria-pressed', 'true')
  await expect(cell(page, 1, 1)).toBeFocused()

  // 外側の位置にある「駒を増やす」も動作しない。「設定」から開くと、駒が画面外ならボタンの近くに出る。
  await button(page, '駒を増やす').scrollIntoViewIfNeeded()
  await button(page, '設定').click()
  await expect(dialog).toBeVisible()
  await expect(button(page, '閉じる')).toBeFocused()
  await expectInViewport(page, dialog)
  const addPoint = await center(button(page, '駒を増やす'))
  const addArea = await box(dialog)
  expect(addPoint.x < addArea.x || addPoint.x > addArea.x + addArea.width || addPoint.y < addArea.y || addPoint.y > addArea.y + addArea.height).toBe(true)
  await pressAt(page, addPoint, testInfo.project.name)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('group', { name: '駒の追加数' })).toHaveCount(0)
  await expect(cell(page, 1, 1)).toHaveAttribute('aria-pressed', 'true')
  await expect(button(page, '設定')).toBeFocused()
})

test('ポップアップで移動力・状態・削除を扱い、削除の取消で同じ駒のポップアップへ戻る', async ({ page }, testInfo) => {
  await page.goto('/')
  await prepare(page, '1', '0')
  await place(page, '味方1', 2, 2)
  await openByGesture(page, cell(page, 2, 2), testInfo.project.name)
  const dialog = popup(page, '味方1')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('status')).toHaveText('5')
  await button(page, '味方1の移動力を減らす').click()
  await expect(dialog.getByRole('status')).toHaveText('4')
  await button(page, '倒れた状態にする').click()
  await expect(dialog.getByText('状態：倒れている')).toBeVisible()
  await expect(button(page, '通常に戻す')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(button(page, 'この駒を削除')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(button(page, '閉じる')).toBeFocused()
  await button(page, 'この駒を削除').click()
  const confirm = page.getByRole('dialog', { name: '駒を削除' })
  await expect(confirm).toContainText('味方1を削除しますか？')
  await confirm.getByRole('button', { name: 'キャンセル' }).click()
  await expect(dialog).toBeVisible()
  await expect(button(page, 'この駒を削除')).toBeFocused()
  await expect(dialog.getByRole('status')).toHaveText('4')
  await expect(dialog.getByText('状態：倒れている')).toBeVisible()
  await button(page, 'この駒を削除').click()
  await page.getByRole('dialog', { name: '駒を削除' }).getByRole('button', { name: '削除する' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(cell(page, 2, 2)).toHaveAccessibleName('マス (2, 2)')
  await expect(page.locator('body')).toBeFocused()
})
