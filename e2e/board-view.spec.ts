import { expect, test, type CDPSession, type Locator, type Page } from '@playwright/test'
import { setCount } from './counts.ts'

// #63: 盤面の拡大・縮小と表示位置の移動（spec.md 2.4）を実ブラウザで確かめる。
// スマホ幅は CDP のタッチ（ピンチ・1本指のドラッグ・長押し）、PC 幅は実際のマウス（ホイール・左右のドラッグ・右クリック）で操作する。
// 倍率は「倍率 n.n倍」の表示と、マスの実際の幅（boundingBox）の比で確かめる。

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true })
const cell = (page: Page, x: number, y: number) => page.getByRole('button', { name: new RegExp(`^マス \\(${x}, ${y}\\)`) })
const token = (page: Page, name: string) => page.getByRole('button', { name: new RegExp(`(?:^未配置 | )${name}（`) })
const board = (page: Page) => page.getByRole('group', { name: '戦闘盤面' })
const zoomText = (page: Page) => page.getByText(/^倍率 /)
const dialogs = (page: Page) => page.getByRole('dialog')
const isMobile = (projectName: string) => projectName === 'chromium-mobile'
type Point = { x: number; y: number }

async function box(locator: Locator) {
  const result = await locator.boundingBox()
  if (!result) throw new Error('要素が表示されていません')
  return result
}
async function center(locator: Locator): Promise<Point> {
  const { x, y, width, height } = await box(locator)
  return { x: x + width / 2, y: y + height / 2 }
}
async function prepare(page: Page, ally: number, enemy: number) {
  await setCount(page, '味方の数', ally)
  await setCount(page, '敵の数', enemy)
  await button(page, '駒を用意する').click()
}
async function place(page: Page, name: string, x: number, y: number) {
  await token(page, name).click()
  await cell(page, x, y).click()
}
/** 表示枠（盤面の外側）の見えている範囲。盤面の中心をピンチ・ホイールの基準に使う。 */
async function frame(page: Page) {
  return box(board(page).locator('xpath=..'))
}
async function boardCenter(page: Page) {
  const { x, y, width, height } = await frame(page)
  return { x: x + width / 2, y: y + height / 2 }
}
async function touch(page: Page, act: (cdp: CDPSession) => Promise<void>) {
  const cdp = await page.context().newCDPSession(page)
  await act(cdp)
  await cdp.detach()
}
const touchEvent = (cdp: CDPSession, type: 'touchStart' | 'touchMove' | 'touchEnd', points: Point[]) =>
  cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(({ x, y }, id) => ({ x, y, id })) })

/** 2本指のピンチ。中心から左右へ start→end の距離（片側）まで開く／閉じる。 */
async function pinch(page: Page, at: Point, start: number, end: number) {
  await touch(page, async (cdp) => {
    await touchEvent(cdp, 'touchStart', [{ x: at.x - start, y: at.y }, { x: at.x + start, y: at.y }])
    for (let step = 1; step <= 8; step += 1) {
      const d = start + ((end - start) * step) / 8
      await touchEvent(cdp, 'touchMove', [{ x: at.x - d, y: at.y }, { x: at.x + d, y: at.y }])
    }
    await touchEvent(cdp, 'touchEnd', [])
  })
}
/**
 * 1本指で from から dx・dy 動かして離す。指を止めてから離す。
 * 動かしたまま離すと Chromium がフリング（慣性）と判定し、直後のタップを「フリングを止める操作」として
 * click にしない（Docker の Chromium で確認。アプリの処理ではなくブラウザの入力の扱い）。止める時間は入力そのものなので固定で待つ。
 */
async function touchDrag(page: Page, from: Point, dx: number, dy: number) {
  await touch(page, async (cdp) => {
    await touchEvent(cdp, 'touchStart', [from])
    for (let step = 1; step <= 8; step += 1) {
      await touchEvent(cdp, 'touchMove', [{ x: from.x + (dx * step) / 8, y: from.y + (dy * step) / 8 }])
    }
    await page.waitForTimeout(200)
    await touchEvent(cdp, 'touchEnd', [])
  })
}
async function mouseDrag(page: Page, from: Point, dx: number, dy: number, button: 'left' | 'right') {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down({ button })
  await page.mouse.move(from.x + dx, from.y + dy, { steps: 8 })
  await page.mouse.up({ button })
}
/** スマホはピンチ、PC はホイールで、盤面の中心を基準に拡大する。 */
async function zoomIn(page: Page, projectName: string, wheelTimes = 4) {
  const at = await boardCenter(page)
  if (isMobile(projectName)) {
    await pinch(page, at, 30, 75)
  } else {
    await page.mouse.move(at.x, at.y)
    for (let i = 0; i < wheelTimes; i += 1) await page.mouse.wheel(0, -100)
  }
  await expect(zoomText(page)).not.toHaveText('倍率 1.0倍')
}
async function drag(page: Page, projectName: string, from: Point, dx: number, dy: number, button: 'left' | 'right' = 'left') {
  if (isMobile(projectName)) await touchDrag(page, from, dx, dy)
  else await mouseDrag(page, from, dx, dy, button)
}
async function pressAt(page: Page, projectName: string, point: Point) {
  if (isMobile(projectName)) await page.touchscreen.tap(point.x, point.y)
  else await page.mouse.click(point.x, point.y)
}
const noHorizontalScroll = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width)

test('全体表示から拡大・表示位置の移動を行い、「全体を見る」で最初の表示へ戻る。マスの大きさは倍率どおりで4倍を超えない', async ({ page }, testInfo) => {
  await page.goto('/')
  const initial = { first: await box(cell(page, 1, 1)), last: await box(cell(page, 10, 10)), frame: await frame(page) }
  await expect(zoomText(page)).toHaveText('倍率 1.0倍')
  // 1倍で盤面全体（左上と右下のマス）が表示枠の中に見えている。
  expect(initial.first.x).toBeGreaterThanOrEqual(initial.frame.x)
  expect(initial.last.x + initial.last.width).toBeLessThanOrEqual(initial.frame.x + initial.frame.width + 0.5)
  await noHorizontalScroll(page)

  const scroll = await page.evaluate(() => window.scrollY)
  await zoomIn(page, testInfo.project.name)
  const scale = Number((await zoomText(page).textContent())!.replace(/[^0-9.]/g, ''))
  expect((await box(cell(page, 5, 5))).width / initial.first.width).toBeCloseTo(scale, 0)
  if (!isMobile(testInfo.project.name)) expect(await page.evaluate(() => window.scrollY)).toBe(scroll)
  await noHorizontalScroll(page)
  await testInfo.attach('拡大した盤面', { body: await page.screenshot(), contentType: 'image/png' })

  const before = await box(cell(page, 5, 5))
  await drag(page, testInfo.project.name, await boardCenter(page), -40, -40)
  const after = await box(cell(page, 5, 5))
  expect(after.x).toBeLessThan(before.x - 20)
  expect(after.y).toBeLessThan(before.y - 20)
  // 表示枠の外へははみ出さない（ページの横スクロールが出ない）。
  await noHorizontalScroll(page)

  await button(page, '全体を見る').click()
  await expect(zoomText(page)).toHaveText('倍率 1.0倍')
  const reset = await box(cell(page, 1, 1))
  expect(reset.x).toBeCloseTo(initial.first.x, 0)
  expect(reset.width).toBeCloseTo(initial.first.width, 0)

  // 4倍の上限。
  const at = await boardCenter(page)
  if (isMobile(testInfo.project.name)) {
    await pinch(page, at, 20, 150)
    await pinch(page, at, 20, 150)
  } else {
    await page.mouse.move(at.x, at.y)
    for (let i = 0; i < 30; i += 1) await page.mouse.wheel(0, -100)
  }
  await expect(zoomText(page)).toHaveText('倍率 4.0倍')
  expect((await box(cell(page, 5, 5))).width / initial.first.width).toBeCloseTo(4, 1)
  await noHorizontalScroll(page)
})

test('駒の上からのドラッグは表示位置だけを動かし、選択・移動・設定を起こさない（PCは左右のボタン）', async ({ page }, testInfo) => {
  await page.goto('/')
  await prepare(page, 2, 0)
  await place(page, '味方1', 4, 4)
  await place(page, '味方2', 6, 6)
  await page.evaluate(() => window.scrollTo(0, 0))
  await zoomIn(page, testInfo.project.name)

  // 未選択で駒の上からドラッグ → 選択しない。
  const piece = cell(page, 6, 6)
  const start = await box(piece)
  await drag(page, testInfo.project.name, await center(piece), -30, -30)
  expect((await box(piece)).x).toBeLessThan(start.x - 15)
  await expect(page.getByRole('button', { pressed: true })).toHaveCount(0)
  await expect(dialogs(page)).toHaveCount(0)

  // 駒を選んで、空きマスの上からドラッグ → 駒は動かず、選択も保つ。
  await pressAt(page, testInfo.project.name, await center(cell(page, 4, 4)))
  await expect(cell(page, 4, 4)).toHaveAttribute('aria-pressed', 'true')
  await drag(page, testInfo.project.name, await center(cell(page, 5, 5)), 30, 20)
  await expect(cell(page, 4, 4)).toHaveAccessibleName(/^マス \(4, 4\) 味方1（/)
  await expect(cell(page, 5, 5)).toHaveAccessibleName(/^マス \(5, 5\)( 移動範囲)?$/)
  await expect(cell(page, 4, 4)).toHaveAttribute('aria-pressed', 'true')
  await expect(dialogs(page)).toHaveCount(0)

  if (!isMobile(testInfo.project.name)) {
    // 右ボタンで駒の上からドラッグ → 表示位置が動き、設定は開かない。
    const before = await box(cell(page, 6, 6))
    await mouseDrag(page, await center(cell(page, 6, 6)), 25, 25, 'right')
    expect((await box(cell(page, 6, 6))).x).toBeGreaterThan(before.x + 10)
    await expect(dialogs(page)).toHaveCount(0)
    await expect(cell(page, 4, 4)).toHaveAttribute('aria-pressed', 'true')
    // ドラッグせずに右ボタンを押して離す → その駒を選択して開く。
    const at = await center(cell(page, 6, 6))
    await page.mouse.click(at.x, at.y, { button: 'right' })
    await expect(page.getByRole('dialog', { name: '味方2の設定' })).toBeVisible()
    await expect(cell(page, 6, 6)).toHaveAttribute('aria-pressed', 'true')
  } else {
    // 動かさない長押しは拡大中も開く。
    const at = await center(cell(page, 6, 6))
    await touch(page, async (cdp) => {
      await touchEvent(cdp, 'touchStart', [at])
      await expect(page.getByRole('dialog', { name: '味方2の設定' })).toBeVisible()
      await touchEvent(cdp, 'touchEnd', [])
    })
    await expect(cell(page, 6, 6)).toHaveAttribute('aria-pressed', 'true')
  }
})

test('スマホ：駒の上で長押しのつもりが指を動かすと、表示位置を動かして長押しを取り消す', async ({ page }, testInfo) => {
  test.skip(!isMobile(testInfo.project.name), 'タッチの長押しはスマホ幅で確かめる')
  await page.goto('/')
  await prepare(page, 1, 0)
  await place(page, '味方1', 5, 5)
  await page.evaluate(() => window.scrollTo(0, 0))
  await zoomIn(page, testInfo.project.name)
  const piece = cell(page, 5, 5)
  const from = await center(piece)
  const before = await box(piece)
  await touch(page, async (cdp) => {
    await touchEvent(cdp, 'touchStart', [from])
    for (let step = 1; step <= 4; step += 1) await touchEvent(cdp, 'touchMove', [{ x: from.x + step * 8, y: from.y }])
    // 長押しの判定時間（500ms）を超えて指を置いたままにする。保持時間は入力そのものなので固定時間で待つ。
    await page.waitForTimeout(800)
    await expect(dialogs(page)).toHaveCount(0)
    await touchEvent(cdp, 'touchEnd', [])
  })
  expect((await box(piece)).x).toBeGreaterThan(before.x + 15)
  await expect(dialogs(page)).toHaveCount(0)
  await expect(piece).toHaveAttribute('aria-pressed', 'false')
})

test('スマホ：1倍のときは盤面の上から縦にページをスクロールできる', async ({ page }, testInfo) => {
  test.skip(!isMobile(testInfo.project.name), 'ページの縦スクロールとの区別はスマホ幅で確かめる')
  await page.goto('/')
  await prepare(page, 2, 2)
  await page.evaluate(() => window.scrollTo(0, 0))
  await touchDrag(page, await boardCenter(page), 0, -150)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(50)
  await expect(zoomText(page)).toHaveText('倍率 1.0倍')
})

test('拡大・移動した表示で押したマスに、駒の配置・移動が行われる。移動範囲の表示も保つ', async ({ page }, testInfo) => {
  await page.goto('/')
  await prepare(page, 1, 0)
  await page.evaluate(() => window.scrollTo(0, 0))
  await zoomIn(page, testInfo.project.name)
  await drag(page, testInfo.project.name, await boardCenter(page), 30, 30)
  // 見えているマスを座標で押す（DOM の要素ではなく、画面の位置で押したマスが操作されることを確かめる）。
  await token(page, '味方1').click()
  await page.evaluate(() => window.scrollTo(0, 0))
  await pressAt(page, testInfo.project.name, await center(cell(page, 4, 4)))
  await expect(cell(page, 4, 4)).toHaveAccessibleName(/^マス \(4, 4\) 味方1（/)
  await pressAt(page, testInfo.project.name, await center(cell(page, 4, 4)))
  await expect(cell(page, 4, 4)).toHaveAttribute('aria-pressed', 'true')
  await expect(cell(page, 5, 4)).toHaveAccessibleName('マス (5, 4) 移動範囲')
  await pressAt(page, testInfo.project.name, await center(cell(page, 5, 5)))
  await expect(cell(page, 5, 5)).toHaveAccessibleName(/^マス \(5, 5\) 味方1（/)
  await expect(cell(page, 4, 4)).toHaveAccessibleName('マス (4, 4)')
  await expect(zoomText(page)).not.toHaveText('倍率 1.0倍')
})

test('拡大中の駒の設定ポップアップは駒の近くに出て、開閉で盤面がずれない。表示枠の外に隠れた駒は「設定」ボタンの近くに出す', async ({ page }, testInfo) => {
  await page.goto('/')
  // 味方2は、中心の拡大で表示枠の外に隠れるが、画面（window）の中には残る位置に置く。
  // スマホは盤面の下の帯・凡例に重なる位置（縦）、PC は盤面の右のパネルに重なる位置（横）になる。
  const [hx, hy] = isMobile(testInfo.project.name) ? [5, 8] : [10, 5]
  await prepare(page, 2, 0)
  await place(page, '味方1', 5, 5)
  await place(page, '味方2', hx, hy)
  await page.evaluate(() => window.scrollTo(0, 0))
  await zoomIn(page, testInfo.project.name)

  const piece = cell(page, 5, 5)
  const before = await box(piece)
  if (isMobile(testInfo.project.name)) {
    const at = await center(piece)
    await touch(page, async (cdp) => {
      await touchEvent(cdp, 'touchStart', [at])
      await expect(dialogs(page)).toHaveCount(1)
      await touchEvent(cdp, 'touchEnd', [])
    })
  } else {
    await piece.click({ button: 'right' })
  }
  const popup = page.getByRole('dialog', { name: '味方1の設定' })
  await expect(popup).toBeVisible()
  const area = await box(popup)
  const gap = Math.min(Math.abs(area.y - (before.y + before.height)), Math.abs(before.y - (area.y + area.height)))
  expect(gap).toBeLessThanOrEqual(5)
  await button(page, '閉じる').click()
  expect(await box(piece)).toEqual(before)

  // 味方2を選ぶには盤面を全体表示に戻す必要があるので、選んでから拡大し直す。
  await button(page, '全体を見る').click()
  await cell(page, hx, hy).click()
  await page.evaluate(() => window.scrollTo(0, 0))
  await zoomIn(page, testInfo.project.name)
  const settings = button(page, '設定')
  await settings.scrollIntoViewIfNeeded()
  // 押す直前に、味方2が表示枠の外にあり、画面の中には入っていることを確かめる（画面だけで判定すると駒の近くに出てしまう条件）。
  const view = await frame(page)
  const hidden = await box(cell(page, hx, hy))
  const viewport = page.viewportSize()!
  expect(hidden.y >= view.y + view.height || hidden.x >= view.x + view.width).toBe(true)
  expect(hidden.y < viewport.height && hidden.x < viewport.width).toBe(true)
  await settings.click()
  const popup2 = page.getByRole('dialog', { name: '味方2の設定' })
  await expect(popup2).toBeVisible()
  const near = await box(settings)
  const area2 = await box(popup2)
  const gap2 = Math.min(Math.abs(area2.y - (near.y + near.height)), Math.abs(near.y - (area2.y + area2.height)))
  expect(gap2).toBeLessThanOrEqual(5)
})
