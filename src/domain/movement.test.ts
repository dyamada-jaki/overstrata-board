import { distance } from './distance.ts'
import { movementForArmor, reachablePositions } from './movement.ts'
import type { Position } from './types.ts'

const board = { width: 10, height: 10 }
const has = (list: Position[], p: Position) => list.some((q) => q.x === p.x && q.y === p.y)

describe('movementForArmor', () => {
  it('軽装は5', () => {
    expect(movementForArmor('light')).toBe(5)
  })
  it('中装は4', () => {
    expect(movementForArmor('medium')).toBe(4)
  })
  it('重装は3', () => {
    expect(movementForArmor('heavy')).toBe(3)
  })
})

describe('reachablePositions', () => {
  it('移動力以内の距離のマスだけが入り、それより遠いマスは入らない', () => {
    const from = { x: 4, y: 4 }
    const result = reachablePositions({ from, movement: 3, occupied: [], board })
    for (const p of result) expect(distance(from, p)).toBeLessThanOrEqual(3)
    expect(has(result, { x: 7, y: 4 })).toBe(true) // 右へ3 = 3
    expect(has(result, { x: 6, y: 6 })).toBe(true) // 斜めに2 = 3
    expect(has(result, { x: 8, y: 4 })).toBe(false) // 右へ4 = 4
    expect(has(result, { x: 7, y: 7 })).toBe(false) // 斜めに3 = 4
  })

  it('移動力1なら周りの8マス', () => {
    const result = reachablePositions({ from: { x: 4, y: 4 }, movement: 1, occupied: [], board })
    expect(result).toHaveLength(8)
  })

  it('移動力0なら空', () => {
    expect(reachablePositions({ from: { x: 4, y: 4 }, movement: 0, occupied: [], board })).toEqual([])
  })

  it('自分のいるマスは入らない', () => {
    const from = { x: 4, y: 4 }
    expect(has(reachablePositions({ from, movement: 5, occupied: [], board }), from)).toBe(false)
  })

  it('盤面の角にいても盤面の外のマスは入らない', () => {
    const result = reachablePositions({ from: { x: 0, y: 0 }, movement: 1, occupied: [], board })
    expect(result).toEqual([
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ])
  })

  it('盤面の右下の端でも盤面の外のマスは入らない', () => {
    const result = reachablePositions({ from: { x: 9, y: 9 }, movement: 5, occupied: [], board })
    expect(result.length).toBeGreaterThan(0)
    for (const p of result) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThan(10)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThan(10)
    }
  })

  it('長方形の盤面でも盤面の外のマスは入らない', () => {
    const result = reachablePositions({ from: { x: 1, y: 1 }, movement: 5, occupied: [], board: { width: 3, height: 2 } })
    expect(result).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 1 },
      { x: 2, y: 1 },
    ])
  })

  it('他のキャラがいるマスは入らない（味方1 C8 → 敵1 D3 は距離5でも除かれる）', () => {
    const ally1 = { x: 2, y: 7 } // C8
    const enemy1 = { x: 3, y: 2 } // D3
    expect(distance(ally1, enemy1)).toBe(5)
    const result = reachablePositions({
      from: ally1,
      movement: movementForArmor('light'),
      occupied: [enemy1, { x: 5, y: 8 }, { x: 6, y: 1 }], // 敵1 D3, 味方2 F9, 敵2 G2
      board,
    })
    expect(has(result, enemy1)).toBe(false)
    expect(has(result, { x: 5, y: 8 })).toBe(false) // F9
    expect(has(result, { x: 3, y: 3 })).toBe(true) // D4 は空き
    expect(has(result, { x: 2, y: 2 })).toBe(true) // C3 は空き
  })

  it('他のキャラの一覧に自分の位置が入っていても結果は同じ', () => {
    const from = { x: 4, y: 4 }
    const a = reachablePositions({ from, movement: 3, occupied: [], board })
    const b = reachablePositions({ from, movement: 3, occupied: [from], board })
    expect(b).toEqual(a)
  })
})
