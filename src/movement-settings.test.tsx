import { fireEvent, render, screen, within } from '@testing-library/react'
import App from './App.tsx'

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }))
const cell = (x: number, y: number) => screen.getByRole('button', { name: new RegExp(`^マス \\(${x}, ${y}\\)`) })
const token = (name: string) => screen.getByRole('button', { name: new RegExp(`(?:^未配置 | )${name}（`) })
const editor = (name: string) => screen.getByRole('group', { name: `${name}の移動力`, exact: true })
const value = (name: string) => within(editor(name)).getByRole('status')
const step = (name: string, direction: '減らす' | '増やす') => click(`${name}の移動力を${direction}`)
const range = () => screen.queryAllByRole('button', { name: / 移動範囲$/ }).map((el) => el.getAttribute('aria-label'))
function prepare(ally = '2', enemy = '1') {
  fireEvent.change(screen.getByRole('textbox', { name: '味方の数' }), { target: { value: ally } })
  fireEvent.change(screen.getByRole('textbox', { name: '敵の数' }), { target: { value: enemy } })
  click('駒を用意する')
}
function place(name: string, x: number, y: number) {
  fireEvent.click(token(name))
  fireEvent.click(cell(x, y))
}

describe('準備中の駒ごとの移動力（spec.md 2.2・2.3）', () => {
  it('未配置の選択駒だけを±で1ずつ変更し、0/9の端では押せず数値は表示専用', () => {
    render(<App />)
    prepare()
    fireEvent.click(token('味方1'))
    expect(value('味方1')).toHaveTextContent(/^5$/)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
    for (const expected of [4, 3, 2, 1, 0]) {
      step('味方1', '減らす')
      expect(value('味方1')).toHaveTextContent(new RegExp(`^${expected}$`))
    }
    expect(screen.getByRole('button', { name: '味方1の移動力を減らす' })).toBeDisabled()
    step('味方1', '減らす')
    expect(token('味方1')).toHaveAccessibleName('未配置 味方1（味方・移動力0）')
    for (const expected of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      step('味方1', '増やす')
      expect(value('味方1')).toHaveTextContent(new RegExp(`^${expected}$`))
    }
    expect(screen.getByRole('button', { name: '味方1の移動力を増やす' })).toBeDisabled()
    step('味方1', '増やす')
    expect(token('味方1')).toHaveAccessibleName('未配置 味方1（味方・移動力9）')
    expect(token('味方1')).toHaveAttribute('aria-pressed', 'true')
    expect(token('味方2')).toHaveAccessibleName('未配置 味方2（味方・移動力5）')
    expect(token('敵1')).toHaveAccessibleName('未配置 敵1（敵・移動力5）')
    fireEvent.click(token('敵1'))
    step('敵1', '減らす')
    expect(value('敵1')).toHaveTextContent(/^4$/)
    expect(screen.queryByRole('group', { name: '味方1の移動力', exact: true })).not.toBeInTheDocument()
    fireEvent.click(token('味方1'))
    expect(value('味方1')).toHaveTextContent(/^9$/)
    step('味方1', '減らす')
    expect(value('味方1')).toHaveTextContent(/^8$/)
    fireEvent.click(token('味方1'))
    expect(screen.queryByRole('group', { name: /の移動力$/ })).not.toBeInTheDocument()
    expect(range()).toEqual([])
  })

  it('配置前の値を保持し、配置後の編集ですぐ範囲を更新し、占有と盤外を除く', () => {
    render(<App />)
    prepare('1', '1')
    fireEvent.click(token('味方1'))
    for (let i = 0; i < 4; i += 1) step('味方1', '減らす')
    fireEvent.click(cell(1, 1))
    expect(screen.queryByRole('group', { name: /の移動力$/ })).not.toBeInTheDocument()
    place('敵1', 2, 1)
    fireEvent.click(cell(1, 1))
    expect(value('味方1')).toHaveTextContent(/^1$/)
    expect(range()).toEqual(['マス (1, 2) 移動範囲', 'マス (2, 2) 移動範囲'])
    step('味方1', '増やす')
    expect(range()).toEqual([
      'マス (3, 1) 移動範囲', 'マス (1, 2) 移動範囲', 'マス (2, 2) 移動範囲',
      'マス (3, 2) 移動範囲', 'マス (1, 3) 移動範囲', 'マス (2, 3) 移動範囲',
    ])
    expect(cell(1, 1)).toHaveAttribute('aria-pressed', 'true')
    expect(cell(2, 1)).toHaveAccessibleName('マス (2, 1) 敵1（敵・移動力5）')
    fireEvent.click(cell(2, 1))
    expect(value('敵1')).toHaveTextContent(/^5$/)
    expect(cell(1, 1)).toHaveAccessibleName('マス (1, 1) 味方1（味方・移動力2）')
    expect(screen.getAllByRole('button', { name: /^マス .*（/ })).toHaveLength(2)
    fireEvent.click(cell(2, 1))
    expect(screen.queryByRole('group', { name: /の移動力$/ })).not.toBeInTheDocument()
  })

  it('設定欄だけを閉じても選択と範囲を保ち、覆われていたマスへ移動できる', () => {
    render(<App />)
    prepare('1', '0')
    place('味方1', 1, 1)
    fireEvent.click(cell(1, 1))
    step('味方1', '減らす')
    const before = range()
    click('移動力の設定を閉じる')
    expect(screen.queryByRole('group', { name: /の移動力$/ })).not.toBeInTheDocument()
    expect(cell(1, 1)).toHaveAttribute('aria-pressed', 'true')
    expect(range()).toEqual(before)
    fireEvent.click(cell(1, 2))
    expect(cell(1, 2)).toHaveAccessibleName('マス (1, 2) 味方1（味方・移動力4）')
    fireEvent.click(cell(1, 2))
    expect(value('味方1')).toHaveTextContent(/^4$/)
  })

  it('0でも準備中と確定後に自由移動でき、確定で各駒の値・配置を引き継いで編集を終了する', () => {
    render(<App />)
    prepare('1', '1')
    fireEvent.click(token('味方1'))
    for (let i = 0; i < 5; i += 1) step('味方1', '減らす')
    fireEvent.click(cell(1, 1))
    place('敵1', 2, 1)
    fireEvent.click(cell(2, 1))
    for (let i = 0; i < 4; i += 1) step('敵1', '増やす')
    fireEvent.click(cell(1, 1))
    expect(range()).toEqual([])
    fireEvent.click(cell(10, 10))
    expect(cell(10, 10)).toHaveAccessibleName('マス (10, 10) 味方1（味方・移動力0）')
    fireEvent.click(cell(10, 10))
    click('確定')
    expect(screen.queryAllByRole('button', { pressed: true })).toEqual([])
    expect(range()).toEqual([])
    expect(screen.queryByRole('group', { name: /の移動力$/ })).not.toBeInTheDocument()
    expect(cell(2, 1)).toHaveAccessibleName('マス (2, 1) 敵1（敵・移動力9）')
    fireEvent.click(cell(10, 10))
    expect(range()).toEqual([])
    expect(screen.queryByRole('button', { name: /の移動力を/ })).not.toBeInTheDocument()
    fireEvent.click(cell(1, 1))
    expect(cell(1, 1)).toHaveAccessibleName('マス (1, 1) 味方1（味方・移動力0）')
    fireEvent.click(cell(2, 1))
    expect(screen.queryByRole('group', { name: /の移動力$/ })).not.toBeInTheDocument()
    expect(cell(10, 1)).toHaveAccessibleName('マス (10, 1) 移動範囲')
  })

  it.each(['未配置', '配置済み', '確定後'])('%sでリセットを取り消すと値と状態を保ち、実行後は5から用意する', (phase) => {
    render(<App />)
    prepare('1', '0')
    fireEvent.click(token('味方1'))
    step('味方1', '増やす')
    if (phase !== '未配置') {
      fireEvent.click(cell(3, 4))
      if (phase === '確定後') click('確定')
      fireEvent.click(cell(3, 4))
    }
    const before = {
      label: token('味方1').getAttribute('aria-label'),
      range: range(), selected: screen.getAllByRole('button', { pressed: true }),
    }
    const opener = phase === '確定後' ? '新しい戦闘を始める' : '準備をやり直す'
    click(opener)
    click('キャンセル')
    expect(token('味方1')).toHaveAttribute('aria-label', before.label)
    expect(range()).toEqual(before.range)
    expect(screen.getAllByRole('button', { pressed: true })).toEqual(before.selected)
    expect(screen.getByRole('region', { name: phase === '確定後' ? '戦闘中' : '配置の準備' })).toBeVisible()
    if (phase !== '確定後') expect(value('味方1')).toHaveTextContent(/^6$/)
    click(opener)
    click(phase === '確定後' ? '始める' : 'やり直す')
    expect(screen.getByRole('textbox', { name: '味方の数' })).toHaveValue('0')
    expect(screen.getByRole('textbox', { name: '敵の数' })).toHaveValue('0')
    expect(screen.queryAllByRole('button', { name: /^マス .*（/ })).toEqual([])
    expect(screen.queryAllByRole('button', { pressed: true })).toEqual([])
    expect(range()).toEqual([])
    prepare('1', '0')
    fireEvent.click(token('味方1'))
    expect(value('味方1')).toHaveTextContent(/^5$/)
  })
})
