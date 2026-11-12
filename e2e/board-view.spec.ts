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

/** 盤面（変形後の矩形）が表示枠を覆っている（端から余白が出ていない）ことを確かめる。 */
async function expectBoardCoversFrame(page: Page) {
  await expect.poll(async () => {
    const view = await frame(page)
    const area = await box(board(page))
    return area.x <= view.x + 0.5 && area.y <= view.y + 0.5
      && area.x + area.width >= view.x + view.width - 0.5 && area.y + area.height >= view.y + view.height - 0.5
  }).toBe(true)
}

test('PC：4倍で右下を表示したまま画面を縮めても、盤面は表示枠を覆い、倍率・駒・選択を保つ', async ({ page }, testInfo) => {
  test.skip(isMobile(testInfo.project.name), '1280px から 375px へ縮める操作は PC 幅（マウス）から始める')
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await prepare(page, 1, 0)
  await place(page, '味方1', 5, 5)
  await cell(page, 5, 5).click()
  await expect(cell(page, 5, 5)).toHaveAttribute('aria-pressed', 'true')
  await page.evaluate(() => window.scrollTo(0, 0))
  const at = await boardCenter(page)
  await page.mouse.move(at.x, at.y)
  for (let i = 0; i < 30; i += 1) await page.mouse.wheel(0, -100)
  await expect(zoomText(page)).toHaveText('倍率 4.0倍')
  // 左ドラッグで盤面の右下の端まで表示する（端で止まるので、表示枠の大きさ分を何回か動かす）。
  for (let i = 0; i < 4; i += 1) {
    const view = await frame(page)
    await mouseDrag(page, { x: view.x + view.width - 10, y: view.y + view.height - 10 }, -(view.width - 20), -(view.height - 20), 'left')
  }
  const view = await frame(page)
  const area = await box(board(page))
  expect(area.x + area.width).toBeCloseTo(view.x + view.width, 0)
  expect(area.y + area.height).toBeCloseTo(view.y + view.height, 0)

  await page.setViewportSize({ width: 375, height: 667 })
  await expectBoardCoversFrame(page)
  await testInfo.attach('縮めた後の盤面', { body: await page.screenshot(), contentType: 'image/png' })
  await expect(zoomText(page)).toHaveText('倍率 4.0倍')
  await expect(cell(page, 5, 5)).toHaveAccessibleName(/^マス \(5, 5\) 味方1（/)
  await expect(cell(page, 5, 5)).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { pressed: true })).toHaveCount(1)
  await expect(dialogs(page)).toHaveCount(0)
})

test('スマホ：1本目の指を少し（10px 以内）動かしてから2本目を置いても、広げた分だけ最後まで拡大する', async ({ page }, testInfo) => {
  test.skip(!isMobile(testInfo.project.name), '2本指のピンチはスマホ幅で確かめる')
  await page.goto('/')
  await prepare(page, 1, 0)
  await place(page, '味方1', 5, 5)
  await page.evaluate(() => window.scrollTo(0, 0))
  const at = await center(cell(page, 5, 5))
  await touch(page, async (cdp) => {
    // 1本目は駒の上に置き、横に 6px 動かす（長押し・ドラッグの許容量 10px 以内）。
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: at.x - 36, y: at.y, id: 0 }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: at.x - 33, y: at.y, id: 0 }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: at.x - 30, y: at.y, id: 0 }] })
    // 2本目を置き、距離 60px → 150px まで8段で広げる（2.5倍）。
    await touchEvent(cdp, 'touchStart', [{ x: at.x - 30, y: at.y }, { x: at.x + 30, y: at.y }])
    for (let step = 1; step <= 8; step += 1) {
      const d = 30 + (45 * step) / 8
      await touchEvent(cdp, 'touchMove', [{ x: at.x - d, y: at.y }, { x: at.x + d, y: at.y }])
    }
    await touchEvent(cdp, 'touchEnd', [])
  })
  await expect(zoomText(page)).toHaveText('倍率 2.5倍')
  await expect(dialogs(page)).toHaveCount(0)
  await expect(page.getByRole('button', { pressed: true })).toHaveCount(0)
})

// #67: 拡大・移動中も座標の番号を表示枠の上端・左端に残す（spec.md 2.4「拡大・移動中の座標ラベル」）。
// 見えている番号ごとに、同じ番号の列（行）のマスの実際の位置（boundingBox）と比べる。
// 全体が見えているマスの番号は中心を ±1.5px で一致させ（半マスのずれや 1px の間の数え違いを見つける）、
// 切れているマスの番号はマスの見えている部分の中に収める。番号どうしが重ならないこと、帯がマスに重ならないこと、
// 16px 以上見えている列・行の番号が欠けていないことも確かめる。
async function labelProblems(page: Page) {
  return page.evaluate(() => {
    const problems: string[] = []
    const frame = document.querySelector('[aria-label="戦闘盤面"]')!.parentElement!.getBoundingClientRect()
    for (const [name, horizontal] of [['横の座標', true], ['縦の座標', false]] as const) {
      const strip = document.querySelector(`[aria-label="${name}"]`)!
      const stripBox = strip.getBoundingClientRect()
      const [frameStart, frameEnd] = horizontal ? [frame.left, frame.right] : [frame.top, frame.bottom]
      // 帯は表示枠の外（上・左）にあり、マスに重ならない。
      if (horizontal ? stripBox.bottom > frame.top + 0.5 : stripBox.right > frame.left + 0.5) problems.push(`${name}の帯がマスに重なる`)
      const labels = [...strip.querySelectorAll('span')].filter((span) => /^\d+$/.test(span.textContent ?? ''))
      const shown = new Set<number>()
      let previousEnd = -Infinity
      for (const label of labels) {
        const n = Number(label.textContent)
        shown.add(n)
        const box = label.getBoundingClientRect()
        const [start, end] = horizontal ? [box.left, box.right] : [box.top, box.bottom]
        const target = document.querySelector(`[aria-label^="マス (${horizontal ? `${n}, 1` : `1, ${n}`})"]`)!.getBoundingClientRect()
        const [cellStart, cellEnd] = horizontal ? [target.left, target.right] : [target.top, target.bottom]
        const full = cellStart >= frameStart - 0.5 && cellEnd <= frameEnd + 0.5
        if (full) {
          const gap = Math.abs((start + end) / 2 - (cellStart + cellEnd) / 2)
          if (gap > 1.5) problems.push(`${name} ${n}: マスの中心から ${gap.toFixed(1)}px ずれる`)
        } else if (start < Math.max(cellStart, frameStart) - 1 || end > Math.min(cellEnd, frameEnd) + 1) {
          problems.push(`${name} ${n}: 切れたマスの見えている部分の外にはみ出す`)
        }
        if (start < frameStart - 1 || end > frameEnd + 1) problems.push(`${name} ${n}: 表示枠の範囲の外にある`)
        if (start < previousEnd - 0.5) problems.push(`${name} ${n}: 前の番号と重なる`)
        previousEnd = end
      }
      for (let n = 1; n <= 10; n += 1) {
        const target = document.querySelector(`[aria-label^="マス (${horizontal ? `${n}, 1` : `1, ${n}`})"]`)!.getBoundingClientRect()
        const [cellStart, cellEnd] = horizontal ? [target.left, target.right] : [target.top, target.bottom]
        const visible = Math.min(cellEnd, frameEnd) - Math.max(cellStart, frameStart)
        if (visible >= 17 && !shown.has(n)) problems.push(`${name} ${n}: ${visible.toFixed(1)}px 見えているのに番号が無い`)
        if (visible <= 0 && shown.has(n)) problems.push(`${name} ${n}: 見えていない列・行の番号がある`)
      }
    }
    return problems
  })
}
async function expectLabelsMatch(page: Page, testInfo: { attach: (name: string, options: { body: Buffer; contentType: string }) => Promise<void> }, step: string) {
  const problems = await labelProblems(page)
  if (problems.length > 0) await testInfo.attach(`番号のずれ（${step}）`, { body: await page.screenshot(), contentType: 'image/png' })
  expect(problems, step).toEqual([])
}
const axisNumbers = (page: Page, name: '横の座標' | '縦の座標') => page.getByRole('group', { name }).locator('span')

test('拡大・移動を何度繰り返しても、見えている列・行の番号が表示枠の上端・左端で対応するマスに揃い、「全体を見る」で 1〜10 に戻る', async ({ page }, testInfo) => {
  const project = testInfo.project.name
  await page.goto('/')
  await page.evaluate(() => window.scrollTo(0, 0))
  const all = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
  await expect(axisNumbers(page, '横の座標')).toHaveText(all)
  await expect(axisNumbers(page, '縦の座標')).toHaveText(all)
  await expectLabelsMatch(page, testInfo, '1倍')

  await zoomIn(page, project)
  await expectLabelsMatch(page, testInfo, '中間の倍率')
  // 指・マウスを複数回動かす（2回目以降も止まらずに追従すること）。左上の端 → 右下の端 → 中央寄り。
  const moves: [number, number][] = [[400, 400], [-900, -900], [120, 90]]
  for (const [index, [dx, dy]] of moves.entries()) {
    const before = await box(cell(page, 5, 5))
    await drag(page, project, await boardCenter(page), dx, dy)
    expect((await box(cell(page, 5, 5))).x, `${index + 1}回目のドラッグで動く`).not.toBeCloseTo(before.x, 0)
    await expectLabelsMatch(page, testInfo, `${index + 1}回目のドラッグの後`)
    await noHorizontalScroll(page)
  }
  await expect(axisNumbers(page, '横の座標')).not.toHaveCount(10)

  // 4倍と、その表示位置の移動（PC は右ボタンのドラッグも）。
  const at = await boardCenter(page)
  if (isMobile(project)) {
    await pinch(page, at, 20, 150)
    await pinch(page, at, 20, 150)
  } else {
    await page.mouse.move(at.x, at.y)
    for (let i = 0; i < 30; i += 1) await page.mouse.wheel(0, -100)
  }
  await expect(zoomText(page)).toHaveText('倍率 4.0倍')
  await expectLabelsMatch(page, testInfo, '4倍')
  await drag(page, project, await boardCenter(page), -70, 50, 'right')
  await expectLabelsMatch(page, testInfo, '4倍で動かした後')
  await drag(page, project, await boardCenter(page), 37, -23)
  await expectLabelsMatch(page, testInfo, '4倍で2回目に動かした後')
  await testInfo.attach('4倍で動かした番号', { body: await page.screenshot(), contentType: 'image/png' })

  await button(page, '全体を見る').click()
  await expect(zoomText(page)).toHaveText('倍率 1.0倍')
  await expect(axisNumbers(page, '横の座標')).toHaveText(all)
  await expect(axisNumbers(page, '縦の座標')).toHaveText(all)
  await expectLabelsMatch(page, testInfo, '「全体を見る」の後')
  await noHorizontalScroll(page)
})

test('拡大して左上の端を表示し、番号の帯のすぐ隣のマスに駒を配置・移動できる。帯を押しても何も変わらず、帯から始めたドラッグで表示が動く', async ({ page }, testInfo) => {
  const project = testInfo.project.name
  await page.goto('/')
  await prepare(page, 1, 0)
  await page.evaluate(() => window.scrollTo(0, 0))
  await zoomIn(page, project)
  await drag(page, project, await boardCenter(page), 600, 600)
  // 未配置の駒を選ぶ（スマホ幅では一覧までページがスクロールするので、盤面が見える位置へ戻してから測る）。
  await token(page, '味方1').click()
  await page.evaluate(() => window.scrollTo(0, 0))
  const view = await frame(page)
  // 左上のマス (1, 1) は表示枠の左上に接する。帯との境界から 3px 内側を押す。
  const first = await box(cell(page, 1, 1))
  expect(first.x).toBeGreaterThanOrEqual(view.x - 0.5)
  expect(first.x).toBeLessThanOrEqual(view.x + 4)
  await pressAt(page, project, { x: view.x + 3, y: view.y + 3 })
  await expect(cell(page, 1, 1)).toHaveAccessibleName(/^マス \(1, 1\) 味方1（/)

  // 駒を選び、上端の (3, 1) の上の境界のすぐ下（3px）を押すと、そこへ移動する。
  await pressAt(page, project, { x: first.x + first.width / 2, y: view.y + 3 })
  await expect(cell(page, 1, 1)).toHaveAttribute('aria-pressed', 'true')
  const third = await box(cell(page, 3, 1))
  await pressAt(page, project, { x: third.x + third.width / 2, y: view.y + 3 })
  await expect(cell(page, 3, 1)).toHaveAccessibleName(/^マス \(3, 1\) 味方1（/)

  // 左端の (1, 3) へ、左の境界のすぐ右（3px）を押して移動する。
  await pressAt(page, project, { x: third.x + third.width / 2, y: view.y + 3 })
  const row3 = await box(cell(page, 1, 3))
  await pressAt(page, project, { x: view.x + 3, y: row3.y + row3.height / 2 })
  await expect(cell(page, 1, 3)).toHaveAccessibleName(/^マス \(1, 3\) 味方1（/)
  await expectLabelsMatch(page, testInfo, '端のマスを押した後')

  // 駒を選んだまま、帯の上（番号の中央）を押しても、選択・駒の位置は変わらない。
  const columnStrip = await box(page.getByRole('group', { name: '横の座標' }))
  const rowStrip = await box(page.getByRole('group', { name: '縦の座標' }))
  await pressAt(page, project, { x: view.x + 3, y: row3.y + row3.height / 2 })
  await expect(cell(page, 1, 3)).toHaveAttribute('aria-pressed', 'true')
  await pressAt(page, project, { x: first.x + first.width / 2, y: columnStrip.y + columnStrip.height / 2 })
  await pressAt(page, project, { x: rowStrip.x + rowStrip.width / 2, y: row3.y + row3.height / 2 })
  await expect(cell(page, 1, 3)).toHaveAttribute('aria-pressed', 'true')
  await expect(cell(page, 1, 3)).toHaveAccessibleName(/^マス \(1, 3\) 味方1（/)
  await expect(dialogs(page)).toHaveCount(0)

  if (!isMobile(project)) {
    // 帯の上の右クリックは設定もブラウザのメニューも出さない。端の駒の右クリック（動かさず離す）は設定を開く。
    await page.mouse.click(first.x + first.width / 2, columnStrip.y + columnStrip.height / 2, { button: 'right' })
    await expect(dialogs(page)).toHaveCount(0)
    const piece = await box(cell(page, 1, 3))
    await page.mouse.click(view.x + 3, piece.y + piece.height / 2, { button: 'right' })
    await expect(page.getByRole('dialog', { name: '味方1の設定' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialogs(page)).toHaveCount(0)
  }

  // 帯から始めたドラッグ（上の帯 → 左下へ、左の帯 → 上へ）でも表示位置が動き、番号が揃ったまま。
  const before = await box(cell(page, 5, 5))
  await drag(page, project, { x: view.x + view.width / 2, y: columnStrip.y + columnStrip.height / 2 }, -60, 0)
  const afterColumns = await box(cell(page, 5, 5))
  expect(afterColumns.x).toBeLessThan(before.x - 30)
  await drag(page, project, { x: rowStrip.x + rowStrip.width / 2, y: view.y + view.height / 2 }, 0, -60)
  expect((await box(cell(page, 5, 5))).y).toBeLessThan(afterColumns.y - 30)
  await expect(cell(page, 1, 3)).toHaveAccessibleName(/^マス \(1, 3\) 味方1（/)
  await expect(cell(page, 1, 3)).toHaveAttribute('aria-pressed', 'true')
  await expectLabelsMatch(page, testInfo, '帯から始めたドラッグの後')
})
