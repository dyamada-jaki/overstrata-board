import { distance } from './distance.ts'

// spec.md 3.1 の表
const cases: [string, number, number, number][] = [
  ['右へ3', 3, 0, 3],
  ['斜めに1', 1, 1, 1],
  ['斜めに2', 2, 2, 3],
  ['斜めに3', 3, 3, 4],
  ['斜めに4', 4, 4, 6],
  ['右へ4・下へ2', 4, 2, 5],
]

describe('distance', () => {
  it.each(cases)('%s の距離は表どおり', (_, dx, dy, expected) => {
    expect(distance({ x: 2, y: 2 }, { x: 2 + dx, y: 2 + dy })).toBe(expected)
  })

  it.each(cases)('%s を逆向きにしても同じ距離', (_, dx, dy, expected) => {
    expect(distance({ x: 2 + dx, y: 2 + dy }, { x: 2, y: 2 })).toBe(expected)
  })

  it.each(cases)('%s を左右・上下に反転しても同じ距離', (_, dx, dy, expected) => {
    const from = { x: 10, y: 10 }
    expect(distance(from, { x: 10 - dx, y: 10 + dy })).toBe(expected)
    expect(distance(from, { x: 10 + dx, y: 10 - dy })).toBe(expected)
    expect(distance(from, { x: 10 - dx, y: 10 - dy })).toBe(expected)
  })

  it('縦と横を入れ替えても同じ距離（下へ4・右へ2 = 5）', () => {
    expect(distance({ x: 0, y: 0 }, { x: 2, y: 4 })).toBe(5)
  })

  it('同じマスなら0', () => {
    expect(distance({ x: 3, y: 4 }, { x: 3, y: 4 })).toBe(0)
  })
})
