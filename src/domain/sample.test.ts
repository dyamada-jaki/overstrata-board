import { clamp } from './sample.ts'

describe('clamp', () => {
  it('範囲の内側ならそのまま返す', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })

  it('下限より小さければ下限を返す', () => {
    expect(clamp(-3, 0, 10)).toBe(0)
  })

  it('上限より大きければ上限を返す', () => {
    expect(clamp(42, 0, 10)).toBe(10)
  })

  it('境界の値はそのまま返す', () => {
    expect(clamp(0, 0, 10)).toBe(0)
    expect(clamp(10, 0, 10)).toBe(10)
  })
})
