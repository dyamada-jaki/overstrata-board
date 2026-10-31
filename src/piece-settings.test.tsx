import { act, fireEvent, render, screen, within } from '@testing-library/react'
import App from './App.tsx'

const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const token = (name: string) => screen.getByRole('button', { name: new RegExp(`^未配置 ${name}（`) })
const popup = () => screen.getByRole('dialog', { name: /の設定$/ })
function prepare() {
  render(<App />)
  fireEvent.change(screen.getByRole('textbox', { name: '味方の数' }), { target: { value: '2' } })
  click('駒を用意する')
}

it('通常の選択・切替・解除は設定を開かず、設定ボタンは常設で未選択時だけ無効', () => {
  prepare()
  expect(screen.getByRole('button', { name: '設定' })).toBeDisabled()
  for (const name of ['味方1', '味方2', '味方2']) {
    fireEvent.click(token(name))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /の移動力$/ })).not.toBeInTheDocument()
  }
  expect(screen.getByRole('button', { name: '設定' })).toBeDisabled()
})

it('右クリックは対象を選択し、閉じても選択を保ち同じ対象で再度開ける', () => {
  prepare()
  fireEvent.click(token('味方1'))
  fireEvent.contextMenu(token('味方2'))
  expect(popup()).toHaveAccessibleName('味方2の設定')
  expect(within(popup()).getByText('味方・番号2')).toBeVisible()
  expect(token('味方2')).toHaveAttribute('aria-pressed', 'true')
  expect(token('味方1')).toHaveAttribute('aria-pressed', 'false')
  expect(screen.getByRole('button', { name: '設定を閉じる' })).toHaveFocus()
  click('設定を閉じる')
  expect(token('味方2')).toHaveFocus()
  expect(token('味方2')).toHaveAttribute('aria-pressed', 'true')
  expect(fireEvent.contextMenu(token('味方2'))).toBe(false)
  expect(token('味方2')).toHaveAttribute('aria-pressed', 'true')
  fireEvent(popup(), new Event('cancel', { cancelable: true }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(token('味方2')).toHaveFocus()
})

it('設定ボタンとキーボードから開き、Tabは設定内を循環する', () => {
  prepare()
  fireEvent.click(token('味方1'))
  expect(screen.getByText('味方1・移動力5・通常')).toBeVisible()
  const opener = screen.getByRole('button', { name: '設定' })
  opener.focus()
  fireEvent.click(opener)
  expect(fireEvent.keyDown(screen.getByRole('button', { name: '設定を閉じる' }), { key: 'Tab', shiftKey: true })).toBe(false)
  expect(screen.getByRole('button', { name: 'この駒を削除' })).toHaveFocus()
  fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' })
  expect(screen.getByRole('button', { name: 'この駒を削除' })).toHaveFocus()
  expect(fireEvent.keyDown(document.activeElement!, { key: 'Tab' })).toBe(false)
  expect(screen.getByRole('button', { name: '設定を閉じる' })).toHaveFocus()
  const middle = screen.getByRole('button', { name: '味方1の移動力を増やす' })
  for (const shiftKey of [false, true]) {
    middle.focus()
    expect(fireEvent.keyDown(middle, { key: 'Tab', shiftKey })).toBe(true)
    expect(middle).toHaveFocus() // 中間はブラウザの通常のTabへ任せる。
  }
  click('設定を閉じる')
  expect(opener).toHaveFocus()
  fireEvent.keyDown(token('味方2'), { key: 'F10', shiftKey: true })
  expect(popup()).toHaveAccessibleName('味方2の設定')
})

it('削除の取消は同じ設定と変更済みの移動力・状態を保ち、実行だけが削除する', () => {
  prepare()
  fireEvent.contextMenu(token('味方1'))
  click('味方1の移動力を増やす')
  click('倒れた状態にする')
  expect(screen.getByText('味方1・移動力6・倒れている')).toBeVisible()
  click('この駒を削除')
  const confirmation = screen.getByRole('dialog', { name: '駒を削除' })
  expect(within(confirmation).getByRole('button', { name: 'キャンセル' })).toHaveFocus()
  click('キャンセル')
  expect(popup()).toBeVisible()
  expect(screen.getByRole('button', { name: 'この駒を削除' })).toHaveFocus()
  expect(token('味方1')).toHaveAccessibleName('未配置 味方1（味方・移動力6・倒れた状態）')
  expect(within(popup()).getByRole('status')).toHaveTextContent('6')
  click('この駒を削除')
  click('削除する')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /^未配置 味方1/ })).not.toBeInTheDocument()
  expect(token('味方2')).toBeVisible()
  expect(document.body).toHaveFocus()
  click('準備をやり直す')
  click('やり直す')
  fireEvent.change(screen.getByRole('textbox', { name: '味方の数' }), { target: { value: '1' } })
  click('駒を用意する')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByText('駒を選ぶと設定できます')).toBeVisible()
})

it('案内は0体のときアクセシビリティツリーにも表示し、非表示時は両方から隠す', () => {
  render(<App />)
  const hint = screen.getByText('味方か敵を1体以上にしてください')
  expect(screen.getAllByRole('paragraph')).toContain(hint)
  click('味方の数を増やす')
  expect(hint).not.toBeVisible()
  expect(screen.getAllByRole('paragraph')).not.toContain(hint)
  click('駒を用意する')
  click('駒を増やす')
  const additionHint = screen.getByText('味方か敵を1体以上にしてください')
  expect(screen.getAllByRole('paragraph')).toContain(additionHint)
  click('敵の追加数を増やす')
  expect(screen.getAllByRole('paragraph')).not.toContain(additionHint)
})

it('ContextMenuだけで開き、F10単独・他のShiftキーでは開かない。敵も陣営と番号を示す', () => {
  prepare()
  for (const props of [{ key: 'F10' }, { key: 'a', shiftKey: true }, { key: 'Enter' }]) {
    expect(fireEvent.keyDown(token('味方1'), props)).toBe(true)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  }
  expect(fireEvent.keyDown(token('味方1'), { key: 'ContextMenu' })).toBe(false)
  expect(popup()).toHaveAccessibleName('味方1の設定')
  click('設定を閉じる')
  click('駒を増やす')
  click('敵の追加数を増やす')
  click('追加する')
  fireEvent.contextMenu(token('敵1'))
  expect(within(popup()).getByText('敵・番号1')).toBeVisible()
})

function popupFrame() {
  vi.spyOn(popup(), 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 100, 288, 300))
}

function pressPopup(x: number, y: number, endX = x, endY = y) {
  pointer(popup(), 'pointerdown', { clientX: x, clientY: y })
  pointer(popup(), 'pointerup', { clientX: endX, clientY: endY })
  fireEvent.click(popup(), { clientX: endX, clientY: endY })
}

it.each([[99, 250], [389, 250], [250, 99], [250, 401]])('外側(%i,%i)で閉じ、選択を保つ', (x, y) => {
  prepare()
  fireEvent.contextMenu(token('味方1'))
  try {
    popupFrame() // jsdomにないレイアウト境界だけ補い、実際の矩形/入力遮断はE2Eで確認する。
    pressPopup(x, y)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(token('味方1')).toHaveAttribute('aria-pressed', 'true')
  } finally { vi.restoreAllMocks() }
})

it('枠を含む内側や、内外へドラッグしただけでは閉じない', () => {
  prepare()
  fireEvent.contextMenu(token('味方1'))
  try {
    popupFrame()
    for (const [x, y] of [[100, 250], [388, 250], [250, 100], [250, 400], [250, 250]]) {
      pressPopup(x!, y!)
      expect(popup()).toBeVisible()
    }
    pressPopup(250, 250, 99, 250)
    expect(popup()).toBeVisible()
    pressPopup(99, 250, 250, 250)
    expect(popup()).toBeVisible()
  } finally { vi.restoreAllMocks() }
})

it('外側でpointercancelした後も、内側のキーボード操作では閉じない', () => {
  prepare()
  fireEvent.contextMenu(token('味方1'))
  try {
    popupFrame()
    pointer(popup(), 'pointerdown', { clientX: 99, clientY: 250 })
    pointer(popup(), 'pointercancel')
    const plus = screen.getByRole('button', { name: '味方1の移動力を増やす' })
    plus.focus()
    fireEvent.keyDown(plus, { key: 'Enter' })
    fireEvent.click(plus) // キーボード由来のclickの座標は(0,0)。
    expect(popup()).toBeVisible()
    expect(plus).toHaveFocus()
    expect(token('味方1')).toHaveAccessibleName('未配置 味方1（味方・移動力6）')
  } finally { vi.restoreAllMocks() }
})

it('実測の矩形とviewportを配置へ渡し、resizeでも画面内へ収める', () => {
  prepare()
  try {
    vi.spyOn(token('味方1'), 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 100, 40, 40))
    vi.spyOn(HTMLDialogElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 288, 300))
    fireEvent.contextMenu(token('味方1'))
    expect(popup()).toHaveStyle({ left: '100px', top: '148px' })
    vi.stubGlobal('innerWidth', 375)
    vi.stubGlobal('innerHeight', 400)
    fireEvent(window, new Event('resize'))
    expect(popup()).toHaveStyle({ left: '79px', top: '92px' })
  } finally { vi.restoreAllMocks(); vi.unstubAllGlobals() }
})

function pointer(target: HTMLElement, type: string, props: Record<string, unknown> = {}) {
  fireEvent(target, Object.assign(new Event(type, { bubbles: true }), {
    pointerType: 'touch', isPrimary: true, clientX: 20, clientY: 20, ...props,
  }))
}

it('499msでは開かず500msで選択して開く。10px以内の移動を許し、直後のclickで解除しない', () => {
  vi.useFakeTimers()
  try {
    prepare()
    pointer(token('味方1'), 'pointerdown')
    pointer(token('味方1'), 'pointermove', { clientX: 26, clientY: 28 }) // 距離10
    act(() => vi.advanceTimersByTime(499))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1))
    expect(popup()).toHaveAccessibleName('味方1の設定')
    pointer(token('味方1'), 'pointerup')
    fireEvent.click(token('味方1'))
    expect(token('味方1')).toHaveAttribute('aria-pressed', 'true')
    click('設定を閉じる')
    // 新しい通常タップは抑制し続けない。
    pointer(token('味方1'), 'pointerdown')
    pointer(token('味方1'), 'pointerup')
    fireEvent.click(token('味方1'))
    expect(token('味方1')).toHaveAttribute('aria-pressed', 'false')
  } finally { vi.useRealTimers() }
})

it.each(['move', 'up', 'cancel', 'scroll', 'nestedScroll', 'mouse', 'secondary'] as const)('%sでは長押しを開かない', (operation) => {
  vi.useFakeTimers()
  try {
    prepare()
    pointer(token('味方1'), 'pointerdown', operation === 'mouse' ? { pointerType: 'mouse' }
      : operation === 'secondary' ? { isPrimary: false } : {})
    if (operation === 'move') pointer(token('味方1'), 'pointermove', { clientX: 31 })
    if (operation === 'up') pointer(token('味方1'), 'pointerup')
    if (operation === 'cancel') pointer(token('味方1'), 'pointercancel')
    if (operation === 'scroll') fireEvent.scroll(window)
    if (operation === 'nestedScroll') fireEvent.scroll(screen.getByRole('group', { name: '未配置の駒' }))
    act(() => vi.advanceTimersByTime(600))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  } finally { vi.useRealTimers() }
})

it.each(['Enter', ' '])('長押しを閉じた直後も%sで駒の通常の選択解除ができる', (key) => {
  vi.useFakeTimers()
  try {
    prepare()
    pointer(token('味方1'), 'pointerdown')
    act(() => vi.advanceTimersByTime(500))
    pointer(token('味方1'), 'pointerup')
    click('設定を閉じる')
    expect(token('味方1')).toHaveFocus()
    fireEvent.keyDown(token('味方1'), { key })
    fireEvent.click(token('味方1'))
    expect(token('味方1')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  } finally { vi.useRealTimers() }
})
