import { canMoveTo, getDistance, getMovement, getMovementRange } from './movement.ts'

describe('getDistance', () => {
  const examples = [
    { label: '右へ3', dx: 3, dy: 0, distance: 3 },
    { label: '斜めに1', dx: 1, dy: 1, distance: 1 },
    { label: '斜めに2', dx: 2, dy: 2, distance: 3 },
    { label: '斜めに3', dx: 3, dy: 3, distance: 4 },
    { label: '斜めに4', dx: 4, dy: 4, distance: 6 },
    { label: '右へ4・下へ2', dx: 4, dy: 2, distance: 5 },
  ]

  it.each(examples)('$label の距離は $distance', ({ dx, dy, distance }) => {
    expect(getDistance({ x: 2, y: 3 }, { x: 2 + dx, y: 3 + dy })).toBe(distance)
  })

  it.each(examples)('$label の始点と終点を逆にしても同じ', ({ dx, dy, distance }) => {
    expect(getDistance({ x: 2 + dx, y: 3 + dy }, { x: 2, y: 3 })).toBe(distance)
  })

  it.each([
    { xSign: 1, ySign: 1 },
    { xSign: -1, ySign: 1 },
    { xSign: 1, ySign: -1 },
    { xSign: -1, ySign: -1 },
  ])('縦横の交換・向きの反転でも同じ（$xSign, $ySign）', ({ xSign, ySign }) => {
    for (const { dx, dy, distance } of examples) {
      expect(getDistance({ x: 5, y: 5 }, { x: 5 + xSign * dx, y: 5 + ySign * dy })).toBe(distance)
      expect(getDistance({ x: 5, y: 5 }, { x: 5 + xSign * dy, y: 5 + ySign * dx })).toBe(distance)
    }
  })

  it('同じ位置の距離は0', () => {
    expect(getDistance({ x: 2, y: 3 }, { x: 2, y: 3 })).toBe(0)
  })
})

describe('getMovement', () => {
  it.each([
    { armor: 'light', movement: 5 },
    { armor: 'medium', movement: 4 },
    { armor: 'heavy', movement: 3 },
  ] as const)('$armor の移動力は $movement', ({ armor, movement }) => {
    expect(getMovement(armor)).toBe(movement)
  })
})

describe('getMovementRange', () => {
  const boardSize = { width: 5, height: 5 }

  it('移動力1では斜めを含む隣接8マスを返し、現在地を除く', () => {
    expect(getMovementRange({ x: 2, y: 2 }, 1, [], boardSize)).toEqual([
      { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 },
      { x: 1, y: 2 }, { x: 3, y: 2 },
      { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 },
    ])
  })

  it('移動力2では縦横2マス先を含み、距離3の斜め2マス先を除く', () => {
    expect(getMovementRange({ x: 2, y: 2 }, 2, [], boardSize)).toEqual([
      { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 },
      { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 },
      { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 },
      { x: 0, y: 3 }, { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 },
      { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 },
    ])
  })

  it('移動力と同じ距離の斜めマスを含み、それを超えるマスを除く', () => {
    const range = getMovementRange({ x: 0, y: 0 }, 3, [], boardSize)
    expect(range).toContainEqual({ x: 2, y: 2 })
    expect(range).toContainEqual({ x: 3, y: 0 })
    expect(range).not.toContainEqual({ x: 3, y: 2 })
    expect(range).not.toContainEqual({ x: 4, y: 0 })
  })

  it.each([
    { origin: { x: 0, y: 0 }, count: 3 },
    { origin: { x: 4, y: 0 }, count: 3 },
    { origin: { x: 0, y: 4 }, count: 3 },
    { origin: { x: 4, y: 4 }, count: 3 },
    { origin: { x: 2, y: 0 }, count: 5 },
    { origin: { x: 2, y: 4 }, count: 5 },
    { origin: { x: 0, y: 2 }, count: 5 },
    { origin: { x: 4, y: 2 }, count: 5 },
  ])('盤面の端 $origin では盤面外を除く', ({ origin, count }) => {
    const range = getMovementRange(origin, 1, [], boardSize)
    expect(range).toHaveLength(count)
    expect(range).not.toContainEqual(origin)
    for (const { x, y } of range) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(boardSize.width)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThan(boardSize.height)
    }
  })

  it('長方形の幅と高さを別々に扱う', () => {
    expect(getMovementRange({ x: 2, y: 0 }, 5, [], { width: 5, height: 2 })).toEqual([
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 },
      { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 },
    ])
  })

  it('範囲内の他キャラのマスをすべて除く', () => {
    const others = [{ x: 1, y: 0 }, { x: 0, y: 1 }]
    expect(getMovementRange({ x: 0, y: 0 }, 1, others, boardSize)).toEqual([
      { x: 1, y: 1 },
    ])
  })

  it('他キャラに囲まれていてもその向こう側を範囲から除かない', () => {
    const others = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }]
    expect(getMovementRange({ x: 0, y: 0 }, 2, others, boardSize)).toEqual([
      { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 },
    ])
  })

  it('サンプルの軽装キャラから距離5の敵マスも除く', () => {
    const origin = { x: 2, y: 7 }
    const enemy = { x: 3, y: 2 }
    const sampleBoard = { width: 10, height: 10 }
    const movement = getMovement('light')
    expect(getDistance(origin, enemy)).toBe(5)
    expect(getMovementRange(origin, movement, [], sampleBoard)).toContainEqual(enemy)
    expect(getMovementRange(origin, movement, [enemy], sampleBoard)).not.toContainEqual(enemy)
  })

  it('移動力0では現在地も含めず空の一覧を返す', () => {
    expect(getMovementRange({ x: 2, y: 2 }, 0, [], boardSize)).toEqual([])
  })

  it('入力を変更せず、同じ入力から同じ結果を返す', () => {
    const origin = Object.freeze({ x: 0, y: 0 })
    const others = Object.freeze([Object.freeze({ x: 1, y: 0 })])
    const board = Object.freeze({ width: 3, height: 2 })
    const expected = [{ x: 0, y: 1 }, { x: 1, y: 1 }]

    expect(getMovementRange(origin, 1, others, board)).toEqual(expected)
    expect(getMovementRange(origin, 1, others, board)).toEqual(expected)
    expect(origin).toEqual({ x: 0, y: 0 })
    expect(others).toEqual([{ x: 1, y: 0 }])
    expect(board).toEqual({ width: 3, height: 2 })
  })
})


describe('canMoveTo（範囲表示と独立した移動可否）', () => {
  const size = Object.freeze({ width: 10, height: 10 })
  const others = Object.freeze([Object.freeze({ x: 3, y: 2 }), Object.freeze({ x: 5, y: 8 })])

  it.each([{ x: 3, y: 7 }, { x: 9, y: 0 }, { x: 0, y: 0 }, { x: 9, y: 9 },
    { x: 3, y: 1 }, { x: 2, y: 2 }])('盤面内の空き $x,$y は距離によらず許可する', (destination) => {
    expect(canMoveTo(destination, others, size)).toBe(true)
  })
  it.each(others)('他キャラのいる $x,$y には移動できない', (destination) => {
    expect(canMoveTo(destination, others, size)).toBe(false)
  })
  it.each([{ x: -1, y: 0 }, { x: 0, y: -1 }, { x: 10, y: 0 }, { x: 0, y: 10 }])(
    '盤面外の $x,$y には移動できない', (destination) => {
      expect(canMoveTo(destination, others, size)).toBe(false)
    },
  )
  it('長方形の幅と高さの境界を別々に扱う', () => {
    const rectangle = { width: 3, height: 2 }
    expect(canMoveTo({ x: 2, y: 1 }, [], rectangle)).toBe(true)
    expect(canMoveTo({ x: 3, y: 1 }, [], rectangle)).toBe(false)
    expect(canMoveTo({ x: 1, y: 2 }, [], rectangle)).toBe(false)
  })
  it('入力を変更せず、同じ入力には同じ結果を返す', () => {
    const destination = Object.freeze({ x: 9, y: 0 })
    expect(canMoveTo(destination, others, size)).toBe(true)
    expect(canMoveTo(destination, others, size)).toBe(true)
    expect(destination).toEqual({ x: 9, y: 0 })
    expect(others).toEqual([{ x: 3, y: 2 }, { x: 5, y: 8 }])
    expect(size).toEqual({ width: 10, height: 10 })
  })
})
