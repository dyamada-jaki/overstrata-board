import { act, fireEvent, render, screen, within } from '@testing-library/react'
import App from './App.tsx'
import { setCount } from './test/counts.ts'

const board = () => screen.getByRole('group', { name: '戦闘盤面' })
const axis = (name = '横の座標') => screen.getByRole('group', { name })
const numbers = (name?: string) => within(axis(name)).getAllByText(/^\d+$/).map((label) => label.textContent)
const cell = (x: number, y: number) => screen.getByRole('button', { name: new RegExp(`^マス \\(${x}, ${y}\\)`) })
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const wheel = (element: Element, deltaY: number, x = 175.5, y = 205.5) =>
  fireEvent.wheel(element, { deltaY, clientX: x, clientY: y })
function measure() {
  const frame = board().parentElement!
  Object.defineProperty(frame, 'clientWidth', { configurable: true, value: 311 })
  Object.defineProperty(frame, 'clientHeight', { configurable: true, value: 311 })
  frame.getBoundingClientRect = () => ({ x: 20, y: 50, left: 20, top: 50, right: 331, bottom: 361, width: 311, height: 311, toJSON: () => ({}) })
  fireEvent.resize(window)
}
function zoom4() { wheel(cell(5, 5), -10000) }
function pointer(element: Element, type: 'pointerDown' | 'pointerMove' | 'pointerUp', x: number, y: number, kind = 'mouse', id = 1, button = 0) {
  fireEvent[type](element, { clientX: x, clientY: y, pointerType: kind, pointerId: id, button, buttons: type === 'pointerUp' ? 0 : button === 2 ? 2 : 1 })
}
function drag(element: Element, dx: number, dy: number, kind = 'mouse', button = 0) {
  pointer(element, 'pointerDown', 100, 150, kind, 1, button)
  for (let i = 1; i <= 3; i += 1) pointer(element, 'pointerMove', 100 + dx * i / 3, 150 + dy * i / 3, kind, 1, button)
  pointer(element, 'pointerUp', 100 + dx, 150 + dy, kind, 1, button)
  if (button === 0) fireEvent.click(element, { detail: 1 })
}
function prepare() {
  setCount('味方の数', 1)
  click('駒を用意する')
  fireEvent.click(screen.getByRole('button', { name: /^未配置 味方1/ }))
  fireEvent.click(cell(5, 5))
  fireEvent.click(cell(5, 5))
}

describe('#67 座標ラベルを表示枠に残す（Appの操作から）', () => {
  it('ラベルは拡大する盤面の外に1組ずつ置き、1倍では1〜10を表示する', () => {
    render(<App />)
    measure()
    for (const name of ['横の座標', '縦の座標']) {
      expect(board()).not.toContainElement(axis(name))
      expect(numbers(name)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'])
      expect(axis(name).querySelector('button, [tabindex]')).toBeNull()
    }
  })

  it('中央を4倍にすると4〜7、横だけ右端へ動かすと列8〜10・行4〜7となる', () => {
    render(<App />)
    measure()
    zoom4()
    expect(numbers()).toEqual(['4', '5', '6', '7'])
    expect(numbers('縦の座標')).toEqual(['4', '5', '6', '7'])
    drag(cell(5, 5), -1000, 0)
    expect(numbers()).toEqual(['8', '9', '10'])
    expect(numbers('縦の座標')).toEqual(['4', '5', '6', '7'])
    drag(cell(5, 5), 0, 1000)
    expect(numbers()).toEqual(['8', '9', '10'])
    expect(numbers('縦の座標')).toEqual(['1', '2', '3'])
  })

  it('番号の位置と引出線を同じ表示から描き、細い断片でも正しいマスを指す', () => {
    render(<App />)
    measure()
    // 幅311の10列はマス幅30、1pxの線を挟む。5列目/行目は125〜155なので中心140。
    expect(within(axis()).getByText('5')).toHaveStyle({ left: '140px' })
    expect(within(axis('縦の座標')).getByText('5')).toHaveStyle({ top: '140px' })
    zoom4()
    // 中央4倍: 4列目の見えている区間は0〜29.5、中央14.75。
    expect(within(axis()).getByText('4')).toHaveStyle({ left: '14.75px' })
    const line = axis().querySelector('.board-label-leader[data-number="4"]')!
    expect(line).toHaveAttribute('x1', '14.75')
    expect(line).toHaveAttribute('y1', '20')
    expect(line).toHaveAttribute('x2', '14.75')
    expect(line).toHaveAttribute('y2', '24')
    const vertical = axis('縦の座標').querySelector('.board-label-leader[data-number="4"]')!
    expect(vertical).toHaveAttribute('x1', '20')
    expect(vertical).toHaveAttribute('y1', '14.75')
    expect(vertical).toHaveAttribute('x2', '24')
    expect(vertical).toHaveAttribute('y2', '14.75')
    // 28.5pxだけさらに動かすと4列目は1pxになり、番号は10pxへ寄るが行き先は0.5px。
    drag(axis(), -28.5, 0)
    expect(within(axis()).getByText('4')).toHaveStyle({ left: '10px' })
    const partial = axis().querySelector('.board-label-leader[data-number="4"]')!
    expect(partial).toHaveAttribute('x1', '10')
    expect(partial).toHaveAttribute('x2', '0.5')
    expect(partial.closest('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(partial.closest('svg')).toHaveAttribute('viewBox', '0 0 311 24')
    expect(axis('縦の座標').querySelector('svg')).toHaveAttribute('viewBox', '0 0 24 311')
    expect(partial.parentElement!.querySelector('path')).toHaveAttribute('d', 'M0 18V24M1 18V24')
  })

  it.each(['mouse', 'touch'])('%s: 帯と角からのドラッグも追従し、番号のタップは選択を変えない', (kind) => {
    render(<App />)
    prepare()
    measure()
    const range = screen.getAllByRole('button', { name: / 移動範囲$/ }).map((element) => element.getAttribute('aria-label'))
    zoom4()
    drag(axis(), -1000, 0, kind)
    expect(numbers()).toEqual(['8', '9', '10'])
    const corner = axis().parentElement!.querySelector('.board-corner')!
    expect(corner).not.toBeNull()
    drag(corner, 0, -1000, kind)
    expect(numbers('縦の座標')).toEqual(['8', '9', '10'])
    fireEvent.click(within(axis()).getByText('10'))
    expect(cell(5, 5)).toHaveAttribute('aria-pressed', 'true')
    expect(cell(5, 5)).toHaveAccessibleName(/^マス \(5, 5\) 味方1/)
    expect(screen.getAllByRole('button', { name: / 移動範囲$/ }).map((element) => element.getAttribute('aria-label'))).toEqual(range)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('帯のホイールはマス枠を基準に拡大しページをスクロールしない。右クリックで設定を開かない', () => {
    render(<App />)
    prepare()
    measure()
    // 上の帯の座標: マス枠から見て(155.5,-10)。yは上端でclampされる。
    expect(wheel(axis(), -10000, 175.5, 40)).toBe(false)
    expect(board().style.transform).toBe('translate(-466.5px, 0px) scale(4)')
    expect(numbers()).toEqual(['4', '5', '6', '7'])
    expect(numbers('縦の座標')).toEqual(['1', '2', '3'])
    pointer(axis(), 'pointerDown', 100, 40, 'mouse', 1, 2)
    expect(fireEvent.contextMenu(axis(), { button: 2 })).toBe(false)
    pointer(axis(), 'pointerUp', 100, 40, 'mouse', 1, 2)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    drag(axis('縦の座標'), 1000, 0, 'mouse', 2)
    expect(numbers()).toEqual(['1', '2', '3'])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('帯に片方の指を置いたピンチも拡大し、長押し/選択にはならず、残った指で続けられる', () => {
    vi.useFakeTimers()
    try {
      render(<App />)
      prepare()
      measure()
      pointer(axis(), 'pointerDown', 100, 40, 'touch', 1)
      pointer(cell(5, 5), 'pointerDown', 100, 100, 'touch', 2)
      for (let i = 1; i <= 3; i += 1) pointer(cell(5, 5), 'pointerMove', 100, 100 + i * 60, 'touch', 2)
      act(() => { vi.advanceTimersByTime(700) })
      expect(screen.getByText('倍率 4.0倍')).toBeInTheDocument()
      pointer(cell(5, 5), 'pointerUp', 100, 280, 'touch', 2)
      pointer(axis(), 'pointerMove', 100, -960, 'touch', 1)
      pointer(axis(), 'pointerUp', 100, -960, 'touch', 1)
      expect(numbers('縦の座標')).toEqual(['8', '9', '10'])
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(cell(5, 5)).toHaveAttribute('aria-pressed', 'true')
    } finally { vi.useRealTimers() }
  })

  it('全体を見る/やり直し/新しい戦闘で番号も戻り、取消は表示とフォーカスを保つ', () => {
    render(<App />)
    prepare()
    measure()
    zoom4()
    const before = numbers()
    click('準備をやり直す')
    click('キャンセル')
    expect(numbers()).toEqual(before)
    expect(screen.getByRole('button', { name: '準備をやり直す' })).toHaveFocus()
    const reset = screen.getByRole('button', { name: '全体を見る' })
    reset.focus()
    fireEvent.click(reset)
    expect(reset).toHaveFocus()
    expect(numbers()).toHaveLength(10)
    expect(cell(5, 5)).toHaveAttribute('aria-pressed', 'true')
    zoom4()
    click('準備をやり直す')
    click('やり直す')
    expect(numbers()).toHaveLength(10)
    prepare()
    click('確定')
    zoom4()
    click('新しい戦闘を始める')
    click('キャンセル')
    expect(numbers()).toEqual(before)
    click('新しい戦闘を始める')
    click('始める')
    expect(numbers()).toHaveLength(10)
    expect(numbers('縦の座標')).toHaveLength(10)
  })
})
