import { canMoveTo, getDistance, getMovement, getMovementRange, type Position } from './movement.ts'

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
  const occupied = (positions: readonly Position[], downed = false) => positions.map((position) => ({ position, downed }))

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

  it('通常の駒が両脇にいると斜めにも進めず、盤面外を回り込まない', () => {
    const others = [{ x: 1, y: 0 }, { x: 0, y: 1 }]
    expect(getMovementRange({ x: 0, y: 0 }, 1, occupied(others), boardSize)).toEqual([])
  })

  it('通常の駒に囲まれた先には移動力が十分でも到達できない', () => {
    const others = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }]
    expect(getMovementRange({ x: 0, y: 0 }, 9, occupied(others), boardSize)).toEqual([])
  })


  // spec.md 2.3 の具体例。すべて内部座標（表示座標から1を引く）。
  it.each([
    { label: '両脇が通常', origin: { x: 0, y: 0 }, pieces: [{ position: { x: 1, y: 0 }, downed: false }, { position: { x: 0, y: 1 }, downed: false }], target: { x: 1, y: 1 }, cost: null },
    { label: '片脇が空き', origin: { x: 0, y: 0 }, pieces: [{ position: { x: 1, y: 0 }, downed: false }], target: { x: 1, y: 1 }, cost: 1 },
    { label: '片脇が倒れた駒', origin: { x: 0, y: 0 }, pieces: [{ position: { x: 1, y: 0 }, downed: false }, { position: { x: 0, y: 1 }, downed: true }], target: { x: 1, y: 1 }, cost: 1 },
    { label: '通常の駒を迂回', origin: { x: 0, y: 1 }, pieces: [{ position: { x: 1, y: 1 }, downed: false }], target: { x: 2, y: 1 }, cost: 3 },
    { label: '倒れた駒を直進して通過', origin: { x: 0, y: 1 }, pieces: [{ position: { x: 1, y: 1 }, downed: true }], target: { x: 2, y: 1 }, cost: 2 },
  ])('仕様例: $label', ({ origin, pieces, target, cost }) => {
    if (cost === null) {
      expect(getMovementRange(origin, 9, pieces, boardSize)).toEqual([])
    } else {
      expect(getMovementRange(origin, cost - 1, pieces, boardSize)).not.toContainEqual(target)
      const range = getMovementRange(origin, cost, pieces, boardSize)
      expect(range).toContainEqual(target)
      expect(range).not.toContainEqual(origin)
      for (const { position } of pieces) expect(range).not.toContainEqual(position)
    }
  })

  for (const dx of [-1, 1]) for (const dy of [-1, 1]) {
    it.each([
      { a: 'normal', b: 'normal', passes: false },
      { a: 'normal', b: 'empty', passes: true },
      { a: 'empty', b: 'normal', passes: true },
      { a: 'normal', b: 'downed', passes: true },
      { a: 'downed', b: 'normal', passes: true },
      { a: 'downed', b: 'downed', passes: true },
      { a: 'empty', b: 'empty', passes: true },
    ])(`斜め(${dx}, ${dy})の両脇: $a / $b → $passes`, ({ a, b, passes }) => {
      const pieces = [
        ...(a === 'empty' ? [] : [{ position: { x: 2 + dx, y: 2 }, downed: a === 'downed' }]),
        ...(b === 'empty' ? [] : [{ position: { x: 2, y: 2 + dy }, downed: b === 'downed' }]),
      ]
      const range = getMovementRange({ x: 2, y: 2 }, 1, pieces, boardSize)
      expect(range.some(({ x, y }) => x === 2 + dx && y === 2 + dy)).toBe(passes)
      for (const { position } of pieces) expect(range).not.toContainEqual(position)
    })

    it.each([false, true])(`斜め(${dx}, ${dy})の進む先は、倒れた駒=%sのときだけ通過できる`, (downed) => {
      // 一方の脇は空き。もう一方と盤面の残りを塞ぎ、斜め先を通る一本道にする。
      const origin = { x: dx === 1 ? 0 : 2, y: dy === 1 ? 0 : 2 }
      const target = { x: origin.x + 2 * dx, y: origin.y + 2 * dy }
      const middle = { x: origin.x + dx, y: origin.y + dy }
      const pieces = []
      for (let y = 0; y < 3; y += 1) for (let x = 0; x < 3; x += 1) {
        if ((x === origin.x && y === origin.y) || (x === target.x && y === target.y)) continue
        // 右隣と中央の下だけ倒れた駒にする。中央を通る斜め2回は3、迂回はできない。
        pieces.push({ position: { x, y }, downed: (x === middle.x && y === middle.y) ? downed : (x === middle.x && (y === origin.y || y === target.y)) })
      }
      const range = getMovementRange(origin, 3, pieces, { width: 3, height: 3 })
      expect(range).toEqual(downed ? [target] : [])
    })
  }

  it('長方形を横切る通常の壁は盤面外へ迂回できず、倒れた駒の隙間からは通過できる', () => {
    const pieces = occupied([{ x: 1, y: 0 }, { x: 1, y: 1 }])
    const size = { width: 4, height: 2 }
    expect(getMovementRange({ x: 0, y: 0 }, 9, pieces, size)).toEqual([{ x: 0, y: 1 }])
    expect(getMovementRange({ x: 0, y: 0 }, 2, [pieces[0]!, { ...pieces[1]!, downed: true }], size)).toEqual([
      { x: 0, y: 1 }, { x: 2, y: 1 },
    ])
    // (0,0)→(1,1)→(2,0) は斜め2回で3。2の一覧には含めない。
    expect(getMovementRange({ x: 0, y: 0 }, 3, [pieces[0]!, { ...pieces[1]!, downed: true }], size))
      .toContainEqual({ x: 2, y: 0 })
  })

  it('縦長の盤面を横切る壁は、左右の盤面外へ回り込めない', () => {
    // 表示(1,1)から、幅2を塞ぐ通常の駒(1,2)/(2,2)の向こうへは到達不能。
    // 元の4列2行の壁の例を縦横交換し、右端のちょうど1つ外も通り道に使わない。
    const pieces = occupied([{ x: 0, y: 1 }, { x: 1, y: 1 }])
    expect(getMovementRange({ x: 0, y: 0 }, 9, pieces, { width: 2, height: 4 })).toEqual([{ x: 1, y: 0 }])
  })

  it('同じマスへ同じコストで着いても斜めの偶奇が違う経路を捨てない（反転・縦横交換）', () => {
    // (0,0)→(0,1)→(1,2)→(2,3) は4、斜め2回。
    // (0,0)→(0,1)→(0,2)→(1,3)→(2,3) も4、斜め1回。
    // (3,2)への最後の斜めは前者なら1、後者なら2。最少5で、4では届かない。
    for (const flipX of [false, true]) for (const flipY of [false, true]) for (const swap of [false, true]) {
      const transform = ({ x, y }: Position) => {
        const a = flipX ? 4 - x : x
        const b = flipY ? 4 - y : y
        return swap ? { x: b, y: a } : { x: a, y: b }
      }
      const origin = transform({ x: 0, y: 0 })
      const target = transform({ x: 3, y: 2 })
      const pieces = occupied([{ x: 3, y: 1 }, { x: 2, y: 2 }].map(transform))
      expect(getMovementRange(origin, 4, pieces, boardSize)).not.toContainEqual(target)
      expect(getMovementRange(origin, 5, pieces, boardSize)).toContainEqual(target)
    }
  })

  it('縦横を挟んでも斜めの1/2は戻らず、障害物なしでは従来の距離と一致する', () => {
    // (1,1)→(2,2)→(3,2)→(4,3) は1+1+2=4、3では届かない。
    expect(getMovementRange({ x: 0, y: 0 }, 3, [], boardSize)).not.toContainEqual({ x: 3, y: 2 })
    for (const origin of [{ x: 0, y: 0 }, { x: 3, y: 2 }]) {
      for (let movement = 0; movement <= 9; movement += 1) {
        const expected = []
        for (let y = 0; y < 4; y += 1) for (let x = 0; x < 6; x += 1) {
          const distance = getDistance(origin, { x, y })
          if (distance > 0 && distance <= movement) expected.push({ x, y })
        }
        expect(getMovementRange(origin, movement, [], { width: 6, height: 4 })).toEqual(expected)
      }
    }
  })

  it('サンプルの軽装キャラから距離5の敵マスも除く', () => {
    const origin = { x: 2, y: 7 }
    const enemy = { x: 3, y: 2 }
    const sampleBoard = { width: 10, height: 10 }
    const movement = getMovement('light')
    expect(getDistance(origin, enemy)).toBe(5)
    expect(getMovementRange(origin, movement, [], sampleBoard)).toContainEqual(enemy)
    expect(getMovementRange(origin, movement, occupied([enemy]), sampleBoard)).not.toContainEqual(enemy)
  })

  it('移動力0では現在地も含めず空の一覧を返す', () => {
    expect(getMovementRange({ x: 2, y: 2 }, 0, [], boardSize)).toEqual([])
  })

  it('入力を変更せず、同じ入力から同じ結果を返す', () => {
    const origin = Object.freeze({ x: 0, y: 0 })
    const others = Object.freeze([Object.freeze({ x: 1, y: 0 })])
    const board = Object.freeze({ width: 3, height: 2 })
    const expected = [{ x: 0, y: 1 }, { x: 1, y: 1 }]

    expect(getMovementRange(origin, 1, occupied(others), board)).toEqual(expected)
    expect(getMovementRange(origin, 1, occupied(others), board)).toEqual(expected)
    expect(origin).toEqual({ x: 0, y: 0 })
    expect(others).toEqual([{ x: 1, y: 0 }])
    expect(board).toEqual({ width: 3, height: 2 })
  })
})

describe('canMoveTo（spec.md 2.3 移動先の可否）', () => {
  // 味方1 (3, 8) と 敵1 (4, 3) がいる 10×10 の盤面。
  const occupied = [{ x: 2, y: 7 }, { x: 3, y: 2 }]
  const size = { width: 10, height: 10 }

  it.each([
    { label: '移動範囲内の空きマス (3, 4)', target: { x: 2, y: 3 } },
    { label: '移動範囲外の空きマス (10, 1)', target: { x: 9, y: 0 } },
    { label: '味方1と同じ縦8・別の列の空きマス (1, 8)', target: { x: 0, y: 7 } },
    { label: '味方1と同じ横3・別の行の空きマス (3, 1)', target: { x: 2, y: 0 } },
    { label: '盤面の左上 (1, 1)', target: { x: 0, y: 0 } },
    { label: '盤面の右下 (10, 10)', target: { x: 9, y: 9 } },
  ])('$label へは移動できる', ({ target }) => {
    expect(canMoveTo(target, occupied, size)).toBe(true)
  })

  it.each([
    { label: '他キャラのマス (4, 3)', target: { x: 3, y: 2 } },
    { label: '自分のいるマス (3, 8)', target: { x: 2, y: 7 } },
    { label: '盤面の左の外', target: { x: -1, y: 0 } },
    { label: '盤面の右の外', target: { x: 10, y: 0 } },
    { label: '盤面の上の外', target: { x: 0, y: -1 } },
    { label: '盤面の下の外', target: { x: 0, y: 10 } },
  ])('$label へは移動できない', ({ target }) => {
    expect(canMoveTo(target, occupied, size)).toBe(false)
  })

  it('横と縦の大きさを取り違えない（4列2行の盤面）', () => {
    const wide = { width: 4, height: 2 }
    expect(canMoveTo({ x: 3, y: 1 }, [], wide)).toBe(true)
    expect(canMoveTo({ x: 1, y: 3 }, [], wide)).toBe(false)
  })
})
