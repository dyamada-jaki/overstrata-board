import { describe, expect, it } from 'vitest'
import { add } from './add'

describe('add（動作確認用）', () => {
  it('2つの数を足す', () => {
    expect(add(2, 3)).toBe(5)
    expect(add(-2, 2)).toBe(0)
  })
})
