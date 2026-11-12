import { act, fireEvent, render, screen } from '@testing-library/react'
import App from './App.tsx'
import { setCount } from './test/counts.ts'

// #63: 盤面の拡大・縮小と表示位置の移動（spec.md 2.4）。表示操作で駒・選択・設定が変わらないことを、
// 画面の入り口（App）で確かめる。jsdom は pointerup の後の click も、右ボタンの contextmenu も出さないので、
// 実ブラウザと同じ順に自分で発火する。座標の当たり判定と実際のタッチは Chromium E2E で確かめる。

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }))
const cell = (x: number, y: number) => screen.getByRole('button', { name: new RegExp(`^マス \\(${x}, ${y}\\)`) })
const token = (name: string) => screen.getByRole('button', { name: new RegExp(`(?:^未配置 | )${name}（`) })
const pressed = () => screen.queryAllByRole('button', { pressed: true })
const popups = () => screen.queryAllByRole('dialog', { name: /の設定$/ })
const board = () => screen.getByRole('group', { name: '戦闘盤面' })
const zoom = () => screen.getByText(/^倍率 /).textContent
function prepare(ally: number, enemy: number) {
  setCount('味方の数', ally)
  setCount('敵の数', enemy)
  click('駒を用意する')
}
function place(name: string, x: number, y: number) {
  fireEvent.click(token(name))
  fireEvent.click(cell(x, y))
}
/** jsdom にはレイアウトが無いので、表示枠（盤面の外側）の大きさだけ与える。左上は画面の (0, 0)。 */
function setFrame(width = 300, height = 300, left = 0, top = 0) {
  const frame = board().parentElement!
  Object.defineProperty(frame, 'clientWidth', { configurable: true, value: width })
  Object.defineProperty(frame, 'clientHeight', { configurable: true, value: height })
  frame.getBoundingClientRect = () => ({ left, top, right: left + width, bottom: top + height, width, height, x: left, y: top, toJSON: () => ({}) })
}
const wheel = (element: HTMLElement, deltaY: number, x = 150, y = 150) =>
  fireEvent.wheel(element, { deltaY, clientX: x, clientY: y })
/** 中央を基準に2倍にする（ホイール上を1回ずつ、2倍を超えるまで）。 */
function zoomIn(times = 4) {
  for (let i = 0; i < times; i += 1) wheel(cell(5, 5), -100)
}
type Kind = 'mouse' | 'touch'
const pointer = (element: HTMLElement, type: 'pointerDown' | 'pointerMove' | 'pointerUp' | 'pointerCancel',
  x: number, y: number, { kind = 'mouse', button = 0, id = 1, buttons }: { kind?: Kind; button?: number; id?: number; buttons?: number } = {}) =>
  fireEvent[type](element, { pointerType: kind, pointerId: id, button, buttons: buttons ?? (type === 'pointerUp' ? 0 : button === 2 ? 2 : 1), clientX: x, clientY: y })
/** マウスのボタンで押して dx・dy 動かして離し、実ブラウザと同じく離した後の click（左）を出す。 */
function mouseDrag(element: HTMLElement, dx: number, dy: number, button = 0) {
  pointer(element, 'pointerDown', 100, 100, { button })
  pointer(element, 'pointerMove', 100 + dx / 2, 100 + dy / 2, { button })
  pointer(element, 'pointerMove', 100 + dx, 100 + dy, { button })
  pointer(element, 'pointerUp', 100 + dx, 100 + dy, { button })
  if (button === 0) fireEvent.click(element, { detail: 1, button })
}

describe('倍率の範囲と全体表示（受け入れ条件1・3）', () => {
  it('最初は全体表示の1倍。ホイール上で拡大し4倍で止まり、ホイール下で縮小し1倍で止まる', () => {
    render(<App />)
    setFrame()
    expect(zoom()).toBe('倍率 1.0倍')
    expect(board().style.transform).toBe('translate(0px, 0px) scale(1)')
    wheel(cell(5, 5), -100)
    expect(zoom()).toBe('倍率 1.2倍')
    for (let i = 0; i < 20; i += 1) wheel(cell(5, 5), -100)
    expect(zoom()).toBe('倍率 4.0倍')
    for (let i = 0; i < 20; i += 1) wheel(cell(5, 5), 100)
    expect(zoom()).toBe('倍率 1.0倍')
    expect(board().style.transform).toBe('translate(0px, 0px) scale(1)')
  })

  it('ホイールの基準はカーソルの位置。盤面の上のホイールは、1倍・4倍の端でもページをスクロールさせない', () => {
    render(<App />)
    setFrame()
    expect(wheel(cell(1, 1), 100)).toBe(false)
    expect(zoom()).toBe('倍率 1.0倍')
    for (let i = 0; i < 20; i += 1) wheel(cell(1, 1), -100, 0, 0)
    expect(board().style.transform).toBe('translate(0px, 0px) scale(4)')
    expect(wheel(cell(1, 1), -100, 0, 0)).toBe(false)
  })

  // Firefox は行単位（deltaMode 1）やページ単位（deltaMode 2）の deltaY を出すことがある。
  // 換算の規則: 1行 = 16px、1ページ = 表示枠の高さ。換算後はピクセル単位（deltaMode 0）と同じ倍率・位置になる。
  describe('ホイールの単位（deltaMode）をピクセルに換算する', () => {
    /** 新しく描画し、表示枠を与えて、カーソル (60, 90) で1回だけホイールを回したときの倍率と位置。 */
    function afterWheel(deltaY: number, deltaMode: number, width = 300, height = 300) {
      const { unmount } = render(<App />)
      setFrame(width, height)
      fireEvent.wheel(cell(3, 4), { deltaY, deltaMode, clientX: 60, clientY: 90 })
      const result = { zoom: zoom(), transform: board().style.transform }
      unmount()
      return result
    }

    it('ピクセル単位（deltaMode 0）は今のまま。deltaY -100 で約1.22倍', () => {
      const result = afterWheel(-100, 0)
      expect(result.zoom).toBe('倍率 1.2倍')
      expect(result).toEqual(afterWheel(-100, 0))
      expect(result.transform).not.toBe('translate(0px, 0px) scale(1)')
    })

    it('行単位（deltaMode 1）の deltaY -3 は、ピクセル単位の deltaY -48（1行 = 16px）と同じ倍率・位置になる', () => {
      const lines = afterWheel(-3, 1)
      expect(lines).toEqual(afterWheel(-48, 0))
      expect(lines).not.toEqual(afterWheel(-3, 0))
    })

    it('行単位で拡大した後の縮小も同じ換算になる（deltaY 2 行 = 32px）', () => {
      const { unmount } = render(<App />)
      setFrame()
      zoomIn()
      fireEvent.wheel(cell(3, 4), { deltaY: 2, deltaMode: 1, clientX: 60, clientY: 90 })
      const lines = { zoom: zoom(), transform: board().style.transform }
      unmount()
      render(<App />)
      setFrame()
      zoomIn()
      fireEvent.wheel(cell(3, 4), { deltaY: 32, deltaMode: 0, clientX: 60, clientY: 90 })
      expect(lines).toEqual({ zoom: zoom(), transform: board().style.transform })
    })

    it('ページ単位（deltaMode 2）の deltaY -1 は、ピクセル単位の deltaY -（表示枠の高さ）と同じ倍率・位置になる（幅ではなく高さ）', () => {
      const page = afterWheel(-1, 2, 400, 250)
      expect(page).toEqual(afterWheel(-250, 0, 400, 250))
      expect(page).not.toEqual(afterWheel(-400, 0, 400, 250))
      expect(page).not.toEqual(afterWheel(-1, 0, 400, 250))
    })
  })

  it('「全体を見る」で1倍・全体の位置へ戻す。拡大・移動・戻す操作で駒の位置と選択は変わらない', () => {
    render(<App />)
    prepare(2, 0)
    place('味方1', 3, 3)
    place('味方2', 5, 5)
    fireEvent.click(cell(3, 3))
    setFrame()
    zoomIn()
    expect(zoom()).not.toBe('倍率 1.0倍')
    mouseDrag(cell(8, 8), -40, -30)
    expect(board().style.transform).not.toBe('translate(0px, 0px) scale(1)')
    expect(pressed()).toEqual([cell(3, 3)])
    click('全体を見る')
    expect(zoom()).toBe('倍率 1.0倍')
    expect(board().style.transform).toBe('translate(0px, 0px) scale(1)')
    expect(pressed()).toEqual([cell(3, 3)])
    expect(cell(3, 3)).toHaveAccessibleName(/^マス \(3, 3\) 味方1（/)
    expect(cell(5, 5)).toHaveAccessibleName(/^マス \(5, 5\) 味方2（/)
  })

  it('拡大後に駒を選択・配置しても表示は戻らない。「準備をやり直す」を実行すると全体表示へ戻り、取り消せば保つ（計画承認時の人間の決定）', () => {
    render(<App />)
    prepare(1, 0)
    setFrame()
    zoomIn()
    const zoomed = zoom()
    place('味方1', 2, 2)
    fireEvent.click(cell(2, 2))
    expect(zoom()).toBe(zoomed)
    click('準備をやり直す')
    click('キャンセル')
    expect(zoom()).toBe(zoomed)
    click('準備をやり直す')
    click('やり直す')
    expect(zoom()).toBe('倍率 1.0倍')
    expect(board().style.transform).toBe('translate(0px, 0px) scale(1)')
  })

  it('「新しい戦闘を始める」でも全体表示へ戻す', () => {
    render(<App />)
    prepare(1, 0)
    place('味方1', 2, 2)
    click('確定')
    setFrame()
    zoomIn()
    click('新しい戦闘を始める')
    click('始める')
    expect(zoom()).toBe('倍率 1.0倍')
  })
})

describe('マウスの左右ドラッグ（受け入れ条件2・4）', () => {
  it('拡大中に左ドラッグ・右ドラッグで表示位置を動かす', () => {
    render(<App />)
    setFrame()
    zoomIn()
    const before = board().style.transform
    mouseDrag(cell(5, 5), -30, -20)
    const afterLeft = board().style.transform
    expect(afterLeft).not.toBe(before)
    mouseDrag(cell(5, 5), 20, 10, 2)
    expect(board().style.transform).not.toBe(afterLeft)
  })

  it('駒を選んだまま空きマスの上から左ドラッグしても、離した後の click で駒は動かず選択も保つ。次のクリックは普通に移動になる', () => {
    render(<App />)
    prepare(1, 0)
    place('味方1', 3, 3)
    fireEvent.click(cell(3, 3))
    setFrame()
    zoomIn()
    mouseDrag(cell(6, 6), 30, 30)
    expect(cell(3, 3)).toHaveAccessibleName(/^マス \(3, 3\) 味方1（/)
    expect(cell(6, 6)).toHaveAccessibleName(/^マス \(6, 6\)( 移動範囲)?$/)
    expect(pressed()).toEqual([cell(3, 3)])
    fireEvent.click(cell(6, 6), { detail: 1 })
    expect(cell(6, 6)).toHaveAccessibleName(/^マス \(6, 6\) 味方1（/)
  })

  it('駒の上から左ドラッグしても、その駒を選択しない。選択中の駒の上からでも解除しない', () => {
    render(<App />)
    prepare(2, 0)
    place('味方1', 3, 3)
    place('味方2', 5, 5)
    mouseDrag(cell(5, 5), 30, 0)
    expect(pressed()).toEqual([])
    fireEvent.click(cell(3, 3))
    mouseDrag(cell(3, 3), 0, 30)
    expect(pressed()).toEqual([cell(3, 3)])
    expect(popups()).toEqual([])
  })

  it('未配置一覧で選んだ駒は、盤面の空きマスの上からドラッグしても配置されない', () => {
    render(<App />)
    prepare(1, 0)
    fireEvent.click(token('味方1'))
    mouseDrag(cell(4, 4), 25, 25)
    expect(token('味方1')).toHaveAccessibleName(/^未配置 味方1（/)
    expect(token('味方1')).toHaveAttribute('aria-pressed', 'true')
  })

  it('10pxまでのぶれはクリックとして選択し、11px動かすとドラッグとして選択しない', () => {
    render(<App />)
    prepare(1, 0)
    place('味方1', 3, 3)
    mouseDrag(cell(3, 3), 6, 8)
    expect(pressed()).toEqual([cell(3, 3)])
    fireEvent.click(cell(3, 3))
    expect(pressed()).toEqual([])
    mouseDrag(cell(3, 3), 0, 11)
    expect(pressed()).toEqual([])
  })
})

describe('右クリックと右ドラッグの区別（受け入れ条件6・ADR 0007 からの変更）', () => {
  it('macOS の順（押した時点で contextmenu）: 動かさず離すと駒を選択して1回だけ開き、ブラウザのメニューは出さない', () => {
    render(<App />)
    prepare(1, 0)
    place('味方1', 3, 3)
    pointer(cell(3, 3), 'pointerDown', 100, 100, { button: 2 })
    expect(fireEvent.contextMenu(cell(3, 3), { button: 2 })).toBe(false)
    expect(popups()).toEqual([])
    pointer(cell(3, 3), 'pointerUp', 100, 100, { button: 2 })
    expect(popups()).toHaveLength(1)
    expect(pressed()).toEqual([cell(3, 3)])
  })

  it('Windows の順（離した後に contextmenu）: 動かさず離すと1回だけ開き、後の contextmenu で閉じない', () => {
    render(<App />)
    prepare(1, 0)
    place('味方1', 3, 3)
    pointer(cell(3, 3), 'pointerDown', 100, 100, { button: 2 })
    pointer(cell(3, 3), 'pointerUp', 100, 100, { button: 2 })
    expect(popups()).toHaveLength(1)
    expect(fireEvent.contextMenu(cell(3, 3), { button: 2 })).toBe(false)
    expect(popups()).toHaveLength(1)
  })

  it.each([['macOS', true], ['Windows', false]] as const)('%s の順: 駒の上から右ドラッグすると開かず、選択も変えない', (_, early) => {
    render(<App />)
    prepare(1, 0)
    place('味方1', 3, 3)
    setFrame()
    zoomIn()
    const before = board().style.transform
    pointer(cell(3, 3), 'pointerDown', 100, 100, { button: 2 })
    if (early) expect(fireEvent.contextMenu(cell(3, 3), { button: 2 })).toBe(false)
    pointer(cell(3, 3), 'pointerMove', 130, 120, { button: 2 })
    pointer(cell(3, 3), 'pointerUp', 130, 120, { button: 2 })
    if (!early) expect(fireEvent.contextMenu(cell(3, 3), { button: 2 })).toBe(false)
    expect(popups()).toEqual([])
    expect(pressed()).toEqual([])
    expect(board().style.transform).not.toBe(before)
  })

  it('空きマスの右クリック・右ドラッグでもブラウザのメニューを出さない', () => {
    render(<App />)
    pointer(cell(4, 4), 'pointerDown', 100, 100, { button: 2 })
    expect(fireEvent.contextMenu(cell(4, 4), { button: 2 })).toBe(false)
    pointer(cell(4, 4), 'pointerUp', 100, 100, { button: 2 })
    expect(popups()).toEqual([])
  })

  it('マウスを伴わない contextmenu（キーボードの Shift+F10・メニューキー）は従来どおり開く', () => {
    render(<App />)
    prepare(1, 0)
    place('味方1', 3, 3)
    fireEvent.contextMenu(cell(3, 3))
    expect(popups()).toHaveLength(1)
  })
})

describe('タッチのドラッグ・ピンチと長押し（受け入れ条件2・4・6。時刻だけ偽のタイマーにする）', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('拡大中に駒の上から1本指でドラッグすると表示位置が動き、長押しにならず、離した後の click で選択しない', () => {
    render(<App />)
    prepare(1, 0)
    place('味方1', 3, 3)
    setFrame()
    zoomIn()
    const before = board().style.transform
    pointer(cell(3, 3), 'pointerDown', 100, 100, { kind: 'touch' })
    pointer(cell(3, 3), 'pointerMove', 120, 130, { kind: 'touch' })
    act(() => { vi.advanceTimersByTime(1000) })
    pointer(cell(3, 3), 'pointerUp', 120, 130, { kind: 'touch' })
    fireEvent.click(cell(3, 3), { detail: 1 })
    expect(board().style.transform).not.toBe(before)
    expect(popups()).toEqual([])
    expect(pressed()).toEqual([])
  })

  it('2本指のピンチで、指の間の距離の比だけ拡大する。1本目の長押しは2本目を置いた時点で取り消し、離した後の click で選択しない', () => {
    render(<App />)
    prepare(1, 0)
    place('味方1', 3, 3)
    setFrame()
    pointer(cell(3, 3), 'pointerDown', 100, 100, { kind: 'touch', id: 1 })
    pointer(cell(6, 6), 'pointerDown', 120, 100, { kind: 'touch', id: 2 })
    act(() => { vi.advanceTimersByTime(1000) })
    expect(popups()).toEqual([])
    pointer(cell(6, 6), 'pointerMove', 160, 100, { kind: 'touch', id: 2 })
    expect(zoom()).toBe('倍率 3.0倍')
    pointer(cell(6, 6), 'pointerUp', 160, 100, { kind: 'touch', id: 2 })
    pointer(cell(3, 3), 'pointerUp', 100, 100, { kind: 'touch', id: 1 })
    fireEvent.click(cell(3, 3), { detail: 1 })
    expect(pressed()).toEqual([])
    expect(popups()).toEqual([])
  })

  it('ピンチで縮めても1倍より小さくならない', () => {
    render(<App />)
    setFrame()
    pointer(cell(3, 3), 'pointerDown', 100, 100, { kind: 'touch', id: 1 })
    pointer(cell(6, 6), 'pointerDown', 200, 100, { kind: 'touch', id: 2 })
    pointer(cell(6, 6), 'pointerMove', 110, 100, { kind: 'touch', id: 2 })
    expect(zoom()).toBe('倍率 1.0倍')
  })

  it('動かさずに押し続けた長押しは、拡大中でも従来どおり開く', () => {
    render(<App />)
    prepare(1, 0)
    place('味方1', 3, 3)
    setFrame()
    zoomIn()
    pointer(cell(3, 3), 'pointerDown', 100, 100, { kind: 'touch' })
    act(() => { vi.advanceTimersByTime(500) })
    expect(popups()).toHaveLength(1)
  })

  it('1倍では盤面の上から縦にページをスクロールでき（pan-y）、拡大中は盤面の表示位置の移動に使う（none）', () => {
    render(<App />)
    setFrame()
    const frame = board().parentElement!
    expect(frame.style.touchAction).toBe('pan-y')
    zoomIn()
    expect(frame.style.touchAction).toBe('none')
    click('全体を見る')
    expect(frame.style.touchAction).toBe('pan-y')
  })
})

describe('拡大後の駒の操作（受け入れ条件5）', () => {
  it('拡大・移動した後も、クリックで配置・移動でき、倒れた駒は空きマスへ動かない', () => {
    render(<App />)
    prepare(1, 0)
    setFrame()
    zoomIn()
    mouseDrag(cell(5, 5), -20, -20)
    place('味方1', 4, 4)
    expect(cell(4, 4)).toHaveAccessibleName(/^マス \(4, 4\) 味方1（/)
    fireEvent.click(cell(4, 4))
    expect(cell(6, 4)).toHaveAccessibleName('マス (6, 4) 移動範囲')
    click('設定')
    click('倒れた状態にする')
    click('閉じる')
    fireEvent.click(cell(5, 4))
    expect(cell(4, 4)).toHaveAccessibleName(/^マス \(4, 4\) 味方1（.*倒れた状態）$/)
    expect(zoom()).not.toBe('倍率 1.0倍')
  })
})

describe('表示操作の続きと後始末（ミューテーションテストで見つけた検証不足の補強）', () => {
  // 表示枠を画面の (20, 50) に置き、指・カーソルの位置を表示枠の左上からの座標に直すことも確かめる。
  const at = (x: number, y: number) => [x + 20, y + 50] as const
  function pinchTo3x() {
    pointer(cell(3, 3), 'pointerDown', ...at(100, 100), { kind: 'touch', id: 1 })
    pointer(cell(6, 6), 'pointerDown', ...at(120, 100), { kind: 'touch', id: 2 })
    // 距離20→60で3倍。中点は (110, 100) → (130, 100)。1倍では表示位置を動かせないので、新しい中点 (130, 100) を基準に3倍にする。
    pointer(cell(6, 6), 'pointerMove', ...at(160, 100), { kind: 'touch', id: 2 })
    expect(board().style.transform).toBe('translate(-260px, -200px) scale(3)')
  }

  it('ピンチは2本指の中点を基準に拡大し、中点の移動で表示位置を同じ向きに動かす', () => {
    render(<App />)
    setFrame(300, 300, 20, 50)
    pinchTo3x()
    pointer(cell(6, 6), 'pointerUp', ...at(160, 100), { kind: 'touch', id: 2 })
    pointer(cell(3, 3), 'pointerUp', ...at(100, 100), { kind: 'touch', id: 1 })
    // 指の間隔を保ったまま2本とも右へ30px動かすと、倍率は3倍のまま、盤面も右へ30px動く。
    pointer(cell(3, 3), 'pointerDown', ...at(100, 100), { kind: 'touch', id: 3 })
    pointer(cell(6, 6), 'pointerDown', ...at(160, 100), { kind: 'touch', id: 4 })
    pointer(cell(3, 3), 'pointerMove', ...at(130, 100), { kind: 'touch', id: 3 })
    pointer(cell(6, 6), 'pointerMove', ...at(190, 100), { kind: 'touch', id: 4 })
    expect(board().style.transform).toBe('translate(-230px, -200px) scale(3)')
  })

  it('ドラッグは指・マウスと同じ向きに同じ量だけ動かし、押した位置の近くへ戻すと表示も戻る', () => {
    render(<App />)
    setFrame(300, 300, 20, 50)
    pinchTo3x()
    pointer(cell(6, 6), 'pointerUp', ...at(160, 100), { kind: 'touch', id: 2 })
    pointer(cell(3, 3), 'pointerUp', ...at(100, 100), { kind: 'touch', id: 1 })
    pointer(cell(5, 5), 'pointerDown', 100, 100)
    pointer(cell(5, 5), 'pointerMove', 60, 70)
    expect(board().style.transform).toBe('translate(-300px, -230px) scale(3)')
    pointer(cell(5, 5), 'pointerMove', 95, 100)
    expect(board().style.transform).toBe('translate(-265px, -200px) scale(3)')
  })

  it('ピンチの片方の指を離すと、残りの指でそのまま表示位置を動かし、離した後の click で選択しない', () => {
    render(<App />)
    prepare(1, 0)
    place('味方1', 3, 3)
    setFrame(300, 300, 20, 50)
    pinchTo3x()
    pointer(cell(6, 6), 'pointerUp', ...at(160, 100), { kind: 'touch', id: 2 })
    pointer(cell(3, 3), 'pointerMove', ...at(90, 95), { kind: 'touch', id: 1 })
    expect(board().style.transform).toBe('translate(-270px, -205px) scale(3)')
    pointer(cell(3, 3), 'pointerUp', ...at(90, 95), { kind: 'touch', id: 1 })
    fireEvent.click(cell(3, 3), { detail: 1 })
    expect(pressed()).toEqual([])
  })

  it.each(['pointerUp', 'pointerCancel'] as const)('ドラッグが click なしで終わっても（%s）、次のタップ・キーボードの操作は止めない', (last) => {
    render(<App />)
    prepare(1, 0)
    place('味方1', 3, 3)
    pointer(cell(5, 5), 'pointerDown', 100, 100, { kind: 'touch' })
    pointer(cell(5, 5), 'pointerMove', 100, 140, { kind: 'touch' })
    pointer(cell(5, 5), last, 100, 140, { kind: 'touch' })
    // キーボードの Enter・Space（detail 0）は、直前のドラッグの click として止めない。
    fireEvent.click(cell(3, 3), { detail: 0 })
    expect(pressed()).toEqual([cell(3, 3)])
    // 実際のタッチは、新しい指ごとに別の pointerId になる。
    pointer(cell(6, 6), 'pointerDown', 100, 100, { kind: 'touch', id: 2 })
    pointer(cell(6, 6), 'pointerUp', 100, 100, { kind: 'touch', id: 2 })
    fireEvent.click(cell(6, 6), { detail: 1 })
    expect(cell(6, 6)).toHaveAccessibleName(/^マス \(6, 6\) 味方1（/)
  })

  it('マウスの左クリック・右クリックの後でも、キーボードの contextmenu で開ける', () => {
    render(<App />)
    prepare(1, 0)
    place('味方1', 3, 3)
    pointer(cell(3, 3), 'pointerDown', 100, 100)
    pointer(cell(3, 3), 'pointerUp', 100, 100)
    fireEvent.click(cell(3, 3), { detail: 1 })
    fireEvent.contextMenu(cell(3, 3))
    expect(popups()).toHaveLength(1)
    click('閉じる')
    pointer(cell(3, 3), 'pointerDown', 100, 100, { button: 2 })
    fireEvent.contextMenu(cell(3, 3), { button: 2 })
    pointer(cell(3, 3), 'pointerUp', 100, 100, { button: 2 })
    expect(popups()).toHaveLength(1)
    click('閉じる')
    fireEvent.contextMenu(cell(3, 3))
    expect(popups()).toHaveLength(1)
  })
})

describe('盤面の外の未配置の駒の長押し（#45 の条件。盤面のドラッグに頼らず取り消す）', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('未配置の駒を押して11px動かすと、長押しを取り消す', () => {
    render(<App />)
    prepare(1, 0)
    pointer(token('味方1'), 'pointerDown', 100, 100, { kind: 'touch' })
    pointer(token('味方1'), 'pointerMove', 100, 111, { kind: 'touch' })
    act(() => { vi.advanceTimersByTime(1000) })
    expect(popups()).toEqual([])
  })
})

describe('盤面の外で離した操作・駒の外から始めた右ドラッグ（PR #65 の確認で見つけた不具合の再現）', () => {
  it('Windows の順: 空きマスから右ドラッグして駒の上で離し、離した後の contextmenu が駒に届いても開かない', () => {
    render(<App />)
    prepare(1, 0)
    place('味方1', 3, 3)
    pointer(cell(5, 5), 'pointerDown', 100, 100, { button: 2 })
    pointer(cell(5, 5), 'pointerMove', 130, 100, { button: 2 })
    pointer(cell(3, 3), 'pointerUp', 130, 100, { button: 2 })
    expect(fireEvent.contextMenu(cell(3, 3), { button: 2 })).toBe(false)
    expect(popups()).toEqual([])
    expect(pressed()).toEqual([])
  })

  it('マウスを10px以内だけ動かして盤面の外で離した後、ボタンを押さずに盤面の上を動かしても表示は動かず、次のクリックは選択になる', () => {
    render(<App />)
    prepare(1, 0)
    place('味方1', 3, 3)
    setFrame()
    zoomIn()
    const before = board().style.transform
    pointer(cell(5, 5), 'pointerDown', 100, 100)
    pointer(cell(5, 5), 'pointerMove', 105, 100)
    // 盤面の外で離したので、表示枠には pointerup が届かない。ボタンを押さずに戻ってくる（buttons 0）。
    pointer(cell(5, 5), 'pointerMove', 160, 150, { buttons: 0 })
    expect(board().style.transform).toBe(before)
    pointer(cell(3, 3), 'pointerDown', 160, 150)
    pointer(cell(3, 3), 'pointerUp', 160, 150)
    fireEvent.click(cell(3, 3), { detail: 1 })
    expect(pressed()).toEqual([cell(3, 3)])
  })

  it('ドラッグの後に盤面の外で離して pointerup が届かなくても、次に押したときは新しい操作として扱い、クリックを止めない', () => {
    render(<App />)
    prepare(1, 0)
    place('味方1', 3, 3)
    setFrame()
    zoomIn()
    pointer(cell(5, 5), 'pointerDown', 100, 100)
    pointer(cell(5, 5), 'pointerMove', 140, 100)
    pointer(cell(3, 3), 'pointerDown', 160, 150)
    pointer(cell(3, 3), 'pointerUp', 160, 150)
    fireEvent.click(cell(3, 3), { detail: 1 })
    expect(pressed()).toEqual([cell(3, 3)])
  })
})

describe('表示枠の大きさが変わったときの収め直し（PR #65 の相互レビューで見つけた不具合の再現）', () => {
  /** 4倍に拡大し、左ドラッグで右下の端まで表示する。300×300 の枠では表示位置が (-900, -900) になる。 */
  function zoomToBottomRight() {
    for (let i = 0; i < 20; i += 1) wheel(cell(1, 1), -100, 0, 0)
    mouseDrag(cell(1, 1), -2000, -2000)
    expect(board().style.transform).toBe('translate(-900px, -900px) scale(4)')
  }
  function setUp() {
    render(<App />)
    prepare(1, 0)
    place('味方1', 5, 5)
    fireEvent.click(cell(5, 5))
    setFrame()
    zoomToBottomRight()
  }
  function expectKept() {
    expect(zoom()).toBe('倍率 4.0倍')
    expect(cell(5, 5)).toHaveAccessibleName(/^マス \(5, 5\) 味方1（/)
    expect(pressed()).toEqual([cell(5, 5)])
  }
  afterEach(() => { vi.unstubAllGlobals() })

  it('ResizeObserver の無い環境: 画面の大きさが変わり表示枠が縮んだら、倍率・駒・選択を保ったまま盤面の端に収め直す', () => {
    vi.stubGlobal('ResizeObserver', undefined)
    setUp()
    setFrame(150, 120)
    fireEvent(window, new Event('resize'))
    expect(board().style.transform).toBe('translate(-450px, -360px) scale(4)')
    expectKept()
  })

  it('ResizeObserver のある環境: 表示枠の大きさの変化を受けて収め直す。広がったときは表示位置を動かさない', () => {
    const observers: { callback: () => void; targets: Element[] }[] = []
    vi.stubGlobal('ResizeObserver', class {
      readonly entry: { callback: () => void; targets: Element[] }
      constructor(callback: () => void) { this.entry = { callback, targets: [] }; observers.push(this.entry) }
      observe(target: Element) { this.entry.targets.push(target) }
      unobserve() {}
      disconnect() { this.entry.targets = [] }
    })
    setUp()
    const frame = board().parentElement!
    const watching = observers.filter((observer) => observer.targets.includes(frame))
    expect(watching).toHaveLength(1)
    setFrame(400, 400)
    act(() => { watching[0]!.callback() })
    expect(board().style.transform).toBe('translate(-900px, -900px) scale(4)')
    setFrame(150, 120)
    act(() => { watching[0]!.callback() })
    expect(board().style.transform).toBe('translate(-450px, -360px) scale(4)')
    expectKept()
  })
})
