import { fireEvent, render, screen, within } from '@testing-library/react'
import App from './App.tsx'
import { setCount } from './test/counts.ts'

// #60 他の駒を避ける移動範囲（spec.md 2.3「他の駒を避ける移動範囲」・3.1）。座標は表示と同じ1始まりの (横, 縦)。
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }))
const cell = (x: number, y: number) => screen.getByRole('button', { name: new RegExp(`^マス \\(${x}, ${y}\\)`) })
const token = (name: string) => {
  const group = screen.queryByRole('group', { name: '未配置の駒' })
  return (group && within(group).queryByRole('button', { name: new RegExp(`^未配置 ${name}（`) }))
    || screen.getByRole('button', { name: new RegExp(`(?:^未配置 | )${name}（`) })
}
const pressed = () => screen.queryAllByRole('button', { pressed: true })
const range = () => screen.queryAllByRole('button', { name: / 移動範囲$/ }).map((el) => el.getAttribute('aria-label'))
const inRange = (x: number, y: number) => `マス (${x}, ${y}) 移動範囲`
const open = () => click('設定')
const close = () => click('閉じる')
const times = (name: string, count: number) => {
  for (let i = 0; i < count; i += 1) click(name)
}
function prepare(ally: number, enemy: number) {
  setCount('味方の数', ally)
  setCount('敵の数', enemy)
  click('駒を用意する')
}
function place(name: string, x: number, y: number) {
  fireEvent.click(token(name))
  fireEvent.click(cell(x, y))
}
/** 駒を選んで設定を開き、状態を切り替えて閉じる。選択はその駒に残る。 */
function toggleDowned(name: string) {
  fireEvent.click(token(name))
  open()
  click(/^(倒れた状態にする|通常に戻す)$/)
  close()
}
/** 味方1を (1, 1) の角に置き、敵1 (2, 1)・敵2 (1, 2) で囲む。 */
function cornered() {
  render(<App />)
  prepare(1, 2)
  place('味方1', 1, 1)
  place('敵1', 2, 1)
  place('敵2', 1, 2)
}

describe('他の駒を避ける移動範囲の表示（#60）', () => {
  it('通常の駒2体に脇を塞がれた角の駒は、斜めにも抜けられず目安が出ない', () => {
    cornered()
    fireEvent.click(token('味方1'))
    expect(pressed()).toEqual([token('味方1')])
    // 距離だけなら (2, 2) などが出るが、(2, 1)・(1, 2) が通常の駒なので通り道がない。
    expect(range()).toEqual([])
    expect(cell(2, 2)).toHaveAccessibleName('マス (2, 2)')
  })

  it('脇の駒を倒れた状態にすると、通過して向こう側へ届くが、倒れた駒のマスは目安にしない。通常に戻すと再び塞ぐ', () => {
    cornered()
    toggleDowned('敵1')
    fireEvent.click(token('味方1'))
    const labels = range()
    // 斜めの脇の片方が倒れた駒なら通れる。倒れた駒 (2, 1) を通過して横へ進める。
    expect(labels).toContain(inRange(2, 2))
    expect(labels).toContain(inRange(3, 1))
    expect(labels).toContain(inRange(6, 1))
    expect(labels).not.toContain(inRange(7, 1))
    expect(cell(2, 1)).toHaveAccessibleName('マス (2, 1) 敵1（敵・移動力5・倒れた状態）')
    expect(cell(1, 2)).toHaveAccessibleName('マス (1, 2) 敵2（敵・移動力5）')

    toggleDowned('敵1')
    fireEvent.click(token('味方1'))
    expect(range()).toEqual([])
  })

  it('味方の駒も通常状態なら通れない。陣営を区別せずに塞ぐ', () => {
    render(<App />)
    prepare(2, 1)
    place('味方1', 1, 1)
    place('味方2', 2, 1)
    place('敵1', 1, 2)
    fireEvent.click(token('味方1'))
    expect(range()).toEqual([])
    toggleDowned('味方2')
    fireEvent.click(token('味方1'))
    expect(range()).toContain(inRange(2, 2))
    expect(range()).not.toContain(inRange(2, 1))
  })

  it('準備中に移動力を変えると、回り道で必要な移動力との境界で目安が変わる', () => {
    cornered()
    toggleDowned('敵1')
    // (1, 3) は距離2だが、(1, 2) の通常の駒を避けて (2, 2) を回るので最小3。
    fireEvent.click(token('味方1'))
    open()
    times('味方1の移動力を減らす', 3)
    close()
    expect(token('味方1')).toHaveAccessibleName('マス (1, 1) 味方1（味方・移動力2）')
    expect(range()).toContain(inRange(2, 2))
    expect(range()).not.toContain(inRange(1, 3))
    open()
    click('味方1の移動力を増やす')
    close()
    expect(range()).toContain(inRange(1, 3))
  })

  it('塞いでいた駒を動かすと、選び直したときに現在の配置で目安を出す', () => {
    cornered()
    click('確定')
    fireEvent.click(token('味方1'))
    expect(range()).toEqual([])
    fireEvent.click(token('敵2'))
    fireEvent.click(cell(5, 5))
    expect(cell(5, 5)).toHaveAccessibleName('マス (5, 5) 敵2（敵・移動力5）')
    fireEvent.click(token('味方1'))
    expect(range()).toContain(inRange(1, 2))
    expect(range()).toContain(inRange(2, 2))
    expect(range()).not.toContain(inRange(2, 1))
  })

  it('戦闘途中に追加した駒も、配置すれば通り道を塞ぐ', () => {
    render(<App />)
    prepare(1, 1)
    place('味方1', 1, 1)
    place('敵1', 2, 1)
    click('確定')
    fireEvent.click(token('味方1'))
    expect(range()).toContain(inRange(2, 2))
    fireEvent.click(token('味方1'))
    click('駒を増やす')
    setCount('敵の追加数', 1)
    click('追加する')
    place('敵2', 1, 2)
    fireEvent.click(token('味方1'))
    expect(range()).toEqual([])
  })

  it('目安が出ない駒も、盤面内の範囲外の空きマスへ移動でき、移動後は選択と目安を解除する', () => {
    cornered()
    click('確定')
    fireEvent.click(token('味方1'))
    expect(range()).toEqual([])
    fireEvent.click(cell(6, 6))
    expect(cell(6, 6)).toHaveAccessibleName('マス (6, 6) 味方1（味方・移動力5）')
    expect(cell(1, 1)).toHaveAccessibleName('マス (1, 1)')
    expect(pressed()).toEqual([])
    expect(range()).toEqual([])
  })

  it('他の駒のマスを押すと移動せず選択を切り替える', () => {
    cornered()
    click('確定')
    fireEvent.click(token('味方1'))
    fireEvent.click(cell(2, 1))
    expect(cell(1, 1)).toHaveAccessibleName('マス (1, 1) 味方1（味方・移動力5）')
    expect(pressed()).toEqual([cell(2, 1)])
    // 敵1 (2, 1) は味方1 (1, 1) と敵2 (1, 2) の脇に塞がれず、右・下へ出られる。
    expect(range()).toContain(inRange(3, 1))
    expect(range()).not.toContain(inRange(1, 1))
  })
})
