import { canMoveTo, getDistance, getMovement, getMovementRange, type OtherPieces, type Position } from './movement.ts'

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
  const none = { normal: [], downed: [] }

  it('移動力1では斜めを含む隣接8マスを返し、現在地を除く', () => {
    expect(getMovementRange({ x: 2, y: 2 }, 1, none, boardSize)).toEqual([
      { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 },
      { x: 1, y: 2 }, { x: 3, y: 2 },
      { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 },
    ])
  })

  it('移動力2では縦横2マス先を含み、距離3の斜め2マス先を除く', () => {
    expect(getMovementRange({ x: 2, y: 2 }, 2, none, boardSize)).toEqual([
      { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 },
      { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 },
      { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 },
      { x: 0, y: 3 }, { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 },
      { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 },
    ])
  })

  it('移動力と同じ距離の斜めマスを含み、それを超えるマスを除く', () => {
    const range = getMovementRange({ x: 0, y: 0 }, 3, none, boardSize)
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
    const range = getMovementRange(origin, 1, none, boardSize)
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
    expect(getMovementRange({ x: 2, y: 0 }, 5, none, { width: 5, height: 2 })).toEqual([
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 },
      { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 },
    ])
  })

  // #60: 脇の2マスが通常の駒だと斜めを通れなくなった（spec.md 2.3）ため、斜めを塞がない配置で占有の除外を確かめる。
  it('範囲内の他キャラのマスをすべて除く', () => {
    const others = [{ x: 1, y: 0 }, { x: 1, y: 1 }]
    expect(getMovementRange({ x: 0, y: 0 }, 1, { normal: others, downed: [] }, boardSize)).toEqual([
      { x: 0, y: 1 },
    ])
  })

  // #60 で仕様が変わり、通常の駒は通過できない（spec.md 2.3）。#7 の「向こう側を除かない」期待を置き換えた。
  it('通常の駒に囲まれた角では、移動力が大きくても向こう側を含めない', () => {
    const normal = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }]
    expect(getMovementRange({ x: 0, y: 0 }, 9, { normal, downed: [] }, { width: 10, height: 10 })).toEqual([])
  })

  it('サンプルの軽装キャラから距離5の敵マスも除く', () => {
    const origin = { x: 2, y: 7 }
    const enemy = { x: 3, y: 2 }
    const sampleBoard = { width: 10, height: 10 }
    const movement = getMovement('light')
    expect(getDistance(origin, enemy)).toBe(5)
    expect(getMovementRange(origin, movement, none, sampleBoard)).toContainEqual(enemy)
    expect(getMovementRange(origin, movement, { normal: [enemy], downed: [] }, sampleBoard)).not.toContainEqual(enemy)
  })

  it('移動力0では現在地も含めず空の一覧を返す', () => {
    expect(getMovementRange({ x: 2, y: 2 }, 0, none, boardSize)).toEqual([])
  })

  it('入力を変更せず、同じ入力から同じ結果を返す', () => {
    const origin = Object.freeze({ x: 0, y: 0 })
    const others = Object.freeze({
      normal: Object.freeze([Object.freeze({ x: 1, y: 0 })]),
      downed: Object.freeze([Object.freeze({ x: 0, y: 1 })]),
    })
    const board = Object.freeze({ width: 3, height: 2 })
    const expected = [{ x: 1, y: 1 }]

    expect(getMovementRange(origin, 1, others, board)).toEqual(expected)
    expect(getMovementRange(origin, 1, others, board)).toEqual(expected)
    expect(origin).toEqual({ x: 0, y: 0 })
    expect(others).toEqual({ normal: [{ x: 1, y: 0 }], downed: [{ x: 0, y: 1 }] })
    expect(board).toEqual({ width: 3, height: 2 })
  })
})

describe('getMovementRange の通り道（spec.md 2.3「他の駒を避ける移動範囲」・3.1 / #60）', () => {
  /** 表示と同じ1始まりの (横, 縦) を内部座標にする。 */
  const at = (x: number, y: number) => ({ x: x - 1, y: y - 1 })
  const board10 = { width: 10, height: 10 }
  const reach = (origin: Position, movement: number, others: OtherPieces, size = board10) =>
    getMovementRange(origin, movement, others, size)

  describe('spec.md 2.3 の具体例', () => {
    it('例1: (1, 1) から、通常の駒が (2, 1) と (1, 2) にあると (2, 2) への斜めは通れない', () => {
      const range = reach(at(1, 1), 1, { normal: [at(2, 1), at(1, 2)], downed: [] })
      expect(range).not.toContainEqual(at(2, 2))
      expect(range).toEqual([])
    })

    it('例2: (1, 1) から、通常の駒が (2, 1) だけなら (2, 2) へ斜めに1で届く', () => {
      expect(reach(at(1, 1), 1, { normal: [at(2, 1)], downed: [] })).toEqual([at(1, 2), at(2, 2)])
    })

    it('例3: (1, 1) から、通常の駒 (2, 1)・倒れた駒 (1, 2) なら (2, 2) を含み、(1, 2) 自体は含まない', () => {
      expect(reach(at(1, 1), 1, { normal: [at(2, 1)], downed: [at(1, 2)] })).toEqual([at(2, 2)])
    })

    it('例4: (1, 2) から、通常の駒 (2, 2) の向こうの (3, 2) は最小3。移動力2では含めず、3なら含める', () => {
      const others = { normal: [at(2, 2)], downed: [] }
      expect(reach(at(1, 2), 2, others)).not.toContainEqual(at(3, 2))
      expect(reach(at(1, 2), 3, others)).toContainEqual(at(3, 2))
      expect(reach(at(1, 2), 3, others)).not.toContainEqual(at(2, 2))
    })

    it('例5: (1, 2) から、倒れた駒 (2, 2) を通過して (3, 2) へ2で届く。(2, 2) 自体は含まない', () => {
      const range = reach(at(1, 2), 2, { normal: [], downed: [at(2, 2)] })
      expect(range).toContainEqual(at(3, 2))
      expect(range).not.toContainEqual(at(2, 2))
    })
  })

  describe('斜めの一歩の脇の2マス（4方向とも同じ規則）', () => {
    const origin = { x: 2, y: 2 }
    const size = { width: 5, height: 5 }
    const directions = [
      { name: '右下', dx: 1, dy: 1 },
      { name: '左下', dx: -1, dy: 1 },
      { name: '右上', dx: 1, dy: -1 },
      { name: '左上', dx: -1, dy: -1 },
    ]
    type Kind = 'empty' | 'normal' | 'downed'
    const cases: { label: string; side1: Kind; side2: Kind; target: Kind; included: boolean }[] = [
      { label: '脇が両方とも通常の駒なら通れない', side1: 'normal', side2: 'normal', target: 'empty', included: false },
      { label: '横の脇だけ通常の駒なら通れる', side1: 'normal', side2: 'empty', target: 'empty', included: true },
      { label: '縦の脇だけ通常の駒なら通れる', side1: 'empty', side2: 'normal', target: 'empty', included: true },
      { label: '通常の駒と倒れた駒なら通れる', side1: 'normal', side2: 'downed', target: 'empty', included: true },
      { label: '倒れた駒と通常の駒なら通れる', side1: 'downed', side2: 'normal', target: 'empty', included: true },
      { label: '脇が両方とも倒れた駒なら通れる', side1: 'downed', side2: 'downed', target: 'empty', included: true },
      { label: '進む先が通常の駒なら含めない', side1: 'empty', side2: 'empty', target: 'normal', included: false },
      { label: '進む先が倒れた駒なら含めない', side1: 'empty', side2: 'empty', target: 'downed', included: false },
    ]

    for (const { name, dx, dy } of directions) {
      it.each(cases)(`${name}: $label`, ({ side1, side2, target, included }) => {
        const destination = { x: origin.x + dx, y: origin.y + dy }
        const cells: [Position, Kind][] = [
          [{ x: origin.x + dx, y: origin.y }, side1],
          [{ x: origin.x, y: origin.y + dy }, side2],
          [destination, target],
        ]
        const of = (kind: Kind) => cells.filter(([, k]) => k === kind).map(([position]) => position)
        const range = reach(origin, 1, { normal: of('normal'), downed: of('downed') }, size)
        if (included) expect(range).toContainEqual(destination)
        else expect(range).not.toContainEqual(destination)
      })
    }
  })

  it('縦・横の移動で斜めの順番を戻さない（斜め→横→斜めは 1+1+2=4）', () => {
    // 幅4×高さ2。(2, 1)・(3, 1) が通常の駒で、(1, 1) から (4, 1) へは下の行を回る。
    const others = { normal: [at(2, 1), at(3, 1)], downed: [] }
    const size = { width: 4, height: 2 }
    expect(reach(at(1, 1), 3, others, size)).not.toContainEqual(at(4, 1))
    expect(reach(at(1, 1), 4, others, size)).toContainEqual(at(4, 1))
  })

  it('盤面外を回り道に使わない（縦いっぱいの壁の向こうは含めない）', () => {
    const size = { width: 3, height: 3 }
    const wall = { normal: [at(2, 1), at(2, 2), at(2, 3)], downed: [] }
    expect(reach(at(1, 2), 9, wall, size)).toEqual([at(1, 1), at(1, 3)])
  })

  it('倒れた駒は通り道として何体続いても通過でき、どれも目安に含めない', () => {
    const size = { width: 5, height: 1 }
    const downed = [at(2, 1), at(3, 1), at(4, 1)]
    expect(reach(at(1, 1), 4, { normal: [], downed }, size)).toEqual([at(5, 1)])
    expect(reach(at(1, 1), 3, { normal: [], downed }, size)).toEqual([])
  })

  it('障害になる駒がなければ、全出発マス・移動力0〜9で従来の距離計算と一致する', () => {
    const none = { normal: [], downed: [] }
    for (let oy = 0; oy < 10; oy += 1) {
      for (let ox = 0; ox < 10; ox += 1) {
        const origin = { x: ox, y: oy }
        for (let movement = 0; movement <= 9; movement += 1) {
          const expected: Position[] = []
          for (let y = 0; y < 10; y += 1) {
            for (let x = 0; x < 10; x += 1) {
              if ((x !== ox || y !== oy) && getDistance(origin, { x, y }) <= movement) expected.push({ x, y })
            }
          }
          expect(reach(origin, movement, none)).toEqual(expected)
        }
      }
    }
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
