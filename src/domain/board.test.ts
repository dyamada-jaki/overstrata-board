import { formatPosition, parsePosition } from './board.ts'

describe('内部座標と表示座標の変換（spec.md 2.1）', () => {
  const examples = [
    { position: { x: 0, y: 0 }, label: '(1, 1)' },
    { position: { x: 9, y: 9 }, label: '(10, 10)' },
    { position: { x: 2, y: 3 }, label: '(3, 4)' },
    { position: { x: 29, y: 29 }, label: '(30, 30)' },
  ]

  it.each(examples)('$position を半角記号・空白の $label に変換する', ({ position, label }) => {
    expect(formatPosition(Object.freeze(position))).toBe(label)
  })

  it.each(examples)('$label を横・縦の順で $position に戻す', ({ position, label }) => {
    expect(parsePosition(label)).toEqual(position)
  })

  it.each(['(0, 1)', '(1, 0)', '(01, 1)', '(1,1)', '(1,  1)', '（1, 1）',
    '(1， 1)', '(1, 1)余分', ' (1, 1)', '(1.5, 2)', ''])(
    '正規表記でない %j は変換しない', (label) => {
      expect(parsePosition(label)).toBeNull()
    },
  )
})
