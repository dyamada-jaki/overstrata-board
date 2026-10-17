import { formatPosition, parsePosition } from './coordinate.ts'

// spec.md 2.1 の対応表。表示は1始まりの (横, 縦)。
const examples = [
  { position: { x: 0, y: 0 }, text: '(1, 1)' },
  { position: { x: 9, y: 9 }, text: '(10, 10)' },
  { position: { x: 2, y: 3 }, text: '(3, 4)' },
  { position: { x: 29, y: 29 }, text: '(30, 30)' },
]

describe('formatPosition', () => {
  it.each(examples)('$position は $text と表示する', ({ position, text }) => {
    expect(formatPosition(position)).toBe(text)
  })

  it('横（x）を先、縦（y）を後に書く', () => {
    expect(formatPosition({ x: 2, y: 3 })).not.toBe('(4, 3)')
  })

  it('半角の括弧・カンマと、カンマの後に半角スペース1つを使う', () => {
    expect(formatPosition({ x: 2, y: 3 })).toMatch(/^\(\d+, \d+\)$/)
  })
})

describe('parsePosition', () => {
  it.each(examples)('$text は $position に戻す', ({ position, text }) => {
    expect(parsePosition(text)).toEqual(position)
  })

  it.each(examples)('$position を表示して読み戻すと元に戻る', ({ position }) => {
    expect(parsePosition(formatPosition(position))).toEqual(position)
  })

  it.each([
    { label: 'カンマの後にスペースがない', text: '(3,4)' },
    { label: 'カンマの後にスペースが2つ', text: '(3,  4)' },
    { label: '全角の括弧', text: '（3, 4）' },
    { label: '全角の読点', text: '(3、4)' },
    { label: '括弧がない', text: '3, 4' },
    { label: '0始まりの数字', text: '(0, 1)' },
  ])('正規の表記でない「$text」（$label）は null', ({ text }) => {
    expect(parsePosition(text)).toBeNull()
  })
})
