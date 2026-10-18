import { fireEvent, render, screen, within } from '@testing-library/react'
import App from './App.tsx'
import { formatPosition } from './domain/board.ts'
import { getMovementRange } from './domain/movement.ts'

const samples = [
  { name: '味方1', side: '味方', armor: '軽装', movement: 5, x: 2, y: 7 },
  { name: '味方2', side: '味方', armor: '重装', movement: 3, x: 5, y: 8 },
  { name: '敵1', side: '敵', armor: '中装', movement: 4, x: 3, y: 2 },
  { name: '敵2', side: '敵', armor: '軽装', movement: 5, x: 6, y: 1 },
]
const character = (name: string) => screen.getByRole('button', { name: new RegExp(` ${name} `) })
const cell = (x: number, y: number) => screen.getByRole('button', { name: `マス (${x}, ${y})` })
const range = () => screen.getAllByRole('button').filter((button) => button.getAttribute('aria-description') === '移動範囲')
const placements = () => samples.map(({ name }) => character(name).getAttribute('aria-label'))
const expectCleared = () => {
  expect(screen.queryAllByRole('button', { pressed: true })).toEqual([])
  expect(range()).toEqual([])
}

describe('サンプルキャラの操作（spec.md 2.1–2.3）', () => {
  it('初期4体の名前・陣営・装備・移動力を、重複しない仕様の座標に表示する', () => {
    render(<App />)
    expect(screen.getAllByRole('button')).toHaveLength(100)
    for (const sample of samples) {
      const token = character(sample.name)
      expect(token).toHaveAccessibleName(`マス ${formatPosition(sample)} ${sample.name} ${sample.side} ${sample.armor} 移動力${sample.movement}`)
      expect(token).toHaveTextContent(sample.name.endsWith('1') ? '1' : '2')
    }
    expectCleared()
  })

  it('マスからキャラに切り替え、再タップで位置を変えず全解除し、再選択できる', () => {
    render(<App />)
    const empty = cell(1, 1)
    fireEvent.click(empty)
    expect(screen.getAllByRole('button', { pressed: true })).toEqual([empty])
    const before = placements()
    const ally = character('味方1')
    fireEvent.click(ally)
    expect(screen.getAllByRole('button', { pressed: true })).toEqual([ally])
    expect(empty).toHaveAttribute('aria-pressed', 'false')
    expect(range().length).toBeGreaterThan(0)
    fireEvent.click(ally)
    expectCleared()
    expect(placements()).toEqual(before)
    fireEvent.click(ally)
    expect(screen.getAllByRole('button', { pressed: true })).toEqual([ally])
    expect(range().length).toBeGreaterThan(0)
  })

  it.each(samples)('$name は装備に対応する#7の範囲を表示し、自身と他キャラを除く', (sample) => {
    render(<App />)
    fireEvent.click(character(sample.name))
    // UIが#7へ渡す入力と表示の結合。計算そのものの期待一覧はmovement.test.tsで独立に検証。
    const expected = getMovementRange(sample, sample.movement,
      samples.filter(({ name }) => name !== sample.name), { width: 10, height: 10 })
    expect(range().map((button) => button.getAttribute('aria-label')))
      .toEqual(expected.map((position) => `マス ${formatPosition(position)}`))
    for (const { name } of samples) expect(character(name)).not.toHaveAccessibleDescription('移動範囲')
  })

  it.each([
    ['味方1', 3, 3, 3, 2], // 縦に5と6。距離5の敵1(4,3)は上のテストで除外。
    ['味方2', 6, 6, 6, 5], // 縦に3と4
    ['敵1', 4, 7, 4, 8], // 縦に4と5
  ] as const)('%s の範囲は装備の移動力を境に内外を区別する', (name, inX, inY, outX, outY) => {
    render(<App />)
    fireEvent.click(character(name))
    expect(cell(inX, inY)).toHaveAccessibleDescription('移動範囲')
    expect(cell(outX, outY)).not.toHaveAccessibleDescription('移動範囲')
  })

  it('別キャラを押しても全キャラは移動せず、選択と範囲だけが切り替わる', () => {
    render(<App />)
    const before = placements()
    fireEvent.click(character('味方1'))
    expect(cell(3, 9)).toHaveAccessibleDescription('移動範囲')
    fireEvent.click(character('敵1'))
    expect(placements()).toEqual(before)
    expect(screen.getAllByRole('button', { pressed: true })).toEqual([character('敵1')])
    expect(cell(3, 9)).not.toHaveAccessibleDescription('移動範囲')
    expect(cell(4, 1)).toHaveAccessibleDescription('移動範囲')
  })

  it.each([
    { label: '範囲内', x: 4, y: 8, inRange: true },
    { label: '範囲外', x: 10, y: 1, inRange: false },
  ])('$label の空きマスへ移動後、キャラ・移動先マス・範囲を全解除する', ({ x, y, inRange }) => {
    render(<App />)
    const otherBefore = placements().slice(1)
    fireEvent.click(character('味方1'))
    const destination = cell(x, y)
    expect(range().includes(destination)).toBe(inRange)
    fireEvent.click(destination)
    expect(character('味方1')).toHaveAccessibleName(`マス (${x}, ${y}) 味方1 味方 軽装 移動力5`)
    expect(cell(3, 8)).toBeInTheDocument()
    expect(placements().slice(1)).toEqual(otherBefore)
    expectCleared()
    fireEvent.click(cell(1, 1))
    expect(screen.getAllByRole('button', { pressed: true })).toEqual([cell(1, 1)])
    expect(character('味方1')).toHaveAccessibleName(`マス (${x}, ${y}) 味方1 味方 軽装 移動力5`)
    expect(range()).toEqual([])
    // 移動後の位置から再計算され、旧現在地も範囲内なら行き先になる。
    fireEvent.click(character('味方1'))
    if (inRange) expect(cell(3, 8)).toHaveAccessibleDescription('移動範囲')
    else expect(cell(3, 8)).not.toHaveAccessibleDescription('移動範囲')
  })

  it('キャラ選択中のラベル・余白操作は位置・選択・範囲を変えない', () => {
    render(<App />)
    fireEvent.click(character('敵2'))
    const before = placements()
    const beforeRange = range()
    const targets = [
      within(screen.getByRole('group', { name: '横の座標' })).getByText('7'),
      within(screen.getByRole('group', { name: '縦の座標' })).getByText('2'),
      screen.getByRole('main'), document.body,
    ]
    for (const target of targets) {
      fireEvent.click(target)
      expect(placements()).toEqual(before)
      expect(screen.getAllByRole('button', { pressed: true })).toEqual([character('敵2')])
      expect(range()).toEqual(beforeRange)
    }
  })
})
