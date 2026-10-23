import type { Character } from './character.ts'
import { getMovementRange, type Position } from './movement.ts'
import { getSelectedMovementRange, tapPosition, type BoardState } from './selection.ts'

// spec.md 2.2 のサンプルと同じ配置（内部座標）。移動力は駒ごとの値を使うことを確かめるため変えておく。
const ally1Position: Position = { x: 2, y: 7 }
const ally2Position: Position = { x: 5, y: 8 }
const enemy1Position: Position = { x: 3, y: 2 }
const ally1: Character = { id: 'ally-1', name: '味方1', side: 'ally', number: 1, movement: 5, position: ally1Position }
const ally2: Character = { id: 'ally-2', name: '味方2', side: 'ally', number: 2, movement: 3, position: ally2Position }
const enemy1: Character = { id: 'enemy-1', name: '敵1', side: 'enemy', number: 1, movement: 5, position: enemy1Position }
// 未配置の駒（spec.md 2.2 の駒の準備）。
const enemy2: Character = { id: 'enemy-2', name: '敵2', side: 'enemy', number: 2, movement: 5, position: null }
const characters = [ally1, ally2, enemy1]
const size = { width: 10, height: 10 }

function stateOf(selection: BoardState['selection'], list: readonly Character[] = characters): BoardState {
  return Object.freeze({ characters: Object.freeze([...list]), selection: Object.freeze(selection) })
}

describe('tapPosition（spec.md 2.1・2.3 の選択と移動）', () => {
  it('未選択で空きマスを押すとそのマスを選択する', () => {
    expect(tapPosition(stateOf({ kind: 'none' }), { x: 0, y: 0 }, size))
      .toEqual({ characters, selection: { kind: 'cell', position: { x: 0, y: 0 } } })
  })

  it('選択中のマスを押すと解除し、別の空きマスを押すと切り替える', () => {
    const state = stateOf({ kind: 'cell', position: { x: 0, y: 0 } })
    expect(tapPosition(state, { x: 0, y: 0 }, size).selection).toEqual({ kind: 'none' })
    expect(tapPosition(state, { x: 0, y: 1 }, size).selection)
      .toEqual({ kind: 'cell', position: { x: 0, y: 1 } })
  })

  it.each([
    { label: '未選択', selection: { kind: 'none' } as const },
    { label: 'マス選択中', selection: { kind: 'cell', position: { x: 0, y: 0 } } as const },
  ])('$label にキャラを押すと、そのキャラだけを選択する', ({ selection }) => {
    expect(tapPosition(stateOf(selection), ally1Position, size))
      .toEqual({ characters, selection: { kind: 'character', id: 'ally-1' } })
  })

  it('キャラ選択中に同じキャラを押すと、位置を変えず解除する', () => {
    expect(tapPosition(stateOf({ kind: 'character', id: 'ally-1' }), ally1Position, size))
      .toEqual({ characters, selection: { kind: 'none' } })
  })

  it('キャラ選択中に別キャラを押すと、誰も移動せず選択だけを切り替える', () => {
    expect(tapPosition(stateOf({ kind: 'character', id: 'ally-1' }), enemy1Position, size))
      .toEqual({ characters, selection: { kind: 'character', id: 'enemy-1' } })
  })

  it.each([
    { label: '移動範囲内（距離4）の空きマス (3, 4)', target: { x: 2, y: 3 } },
    { label: '移動範囲外（距離10）の空きマス (10, 1)', target: { x: 9, y: 0 } },
  ])('キャラ選択中に $label を押すと移動し、何も選択しない', ({ target }) => {
    expect(tapPosition(stateOf({ kind: 'character', id: 'ally-1' }), target, size)).toEqual({
      characters: [{ ...ally1, position: target }, ally2, enemy1],
      selection: { kind: 'none' },
    })
  })

  it('キャラ選択中に盤面外を指定しても、位置も選択も変えない', () => {
    const state = stateOf({ kind: 'character', id: 'ally-1' })
    expect(tapPosition(state, { x: 10, y: 0 }, size)).toEqual(state)
  })
})

describe('tapPosition（spec.md 2.2 の未配置の駒）', () => {
  const withUnplaced = [...characters, enemy2]

  it('未配置の駒を選択中に空きマスを押すと、その駒だけを置いて何も選択しない', () => {
    expect(tapPosition(stateOf({ kind: 'character', id: 'enemy-2' }, withUnplaced), { x: 0, y: 0 }, size))
      .toEqual({
        characters: [ally1, ally2, enemy1, { ...enemy2, position: { x: 0, y: 0 } }],
        selection: { kind: 'none' },
      })
  })

  it('未配置の駒を選択中に駒のいるマスを押すと、置かずにその駒へ選択を切り替える', () => {
    expect(tapPosition(stateOf({ kind: 'character', id: 'enemy-2' }, withUnplaced), ally1Position, size))
      .toEqual({ characters: withUnplaced, selection: { kind: 'character', id: 'ally-1' } })
  })

  it('未配置の駒を選択中に盤面外を指定しても、置かず選択も変えない', () => {
    const state = stateOf({ kind: 'character', id: 'enemy-2' }, withUnplaced)
    expect(tapPosition(state, { x: 0, y: 10 }, size)).toEqual(state)
  })

  it('未配置の駒があっても、空きマスの選択は変わらない', () => {
    expect(tapPosition(stateOf({ kind: 'none' }, withUnplaced), { x: 0, y: 0 }, size))
      .toEqual({ characters: withUnplaced, selection: { kind: 'cell', position: { x: 0, y: 0 } } })
  })
})

describe('getSelectedMovementRange', () => {
  it('キャラ以外を選択中・未選択では範囲を出さない', () => {
    expect(getSelectedMovementRange(stateOf({ kind: 'none' }), size)).toEqual([])
    expect(getSelectedMovementRange(stateOf({ kind: 'cell', position: { x: 0, y: 0 } }), size)).toEqual([])
  })

  it('選択中のキャラの移動力で、他キャラのマスを除いた #7 の範囲を返す', () => {
    // 味方2の移動力は3。
    expect(getSelectedMovementRange(stateOf({ kind: 'character', id: 'ally-2' }), size))
      .toEqual(getMovementRange(ally2Position, 3, [ally1Position, enemy1Position], size))
    // 味方1から敵1までは距離5だが、敵1のマスは含まない。
    const range = getSelectedMovementRange(stateOf({ kind: 'character', id: 'ally-1' }), size)
    expect(range).toContainEqual({ x: 2, y: 2 })
    expect(range).not.toContainEqual(enemy1Position)
    expect(range).not.toContainEqual(ally1Position)
  })

  it('未配置の駒を選択中は範囲を出さず、未配置の駒は他の駒のマスに数えない', () => {
    const state = stateOf({ kind: 'character', id: 'enemy-2' }, [...characters, enemy2])
    expect(getSelectedMovementRange(state, size)).toEqual([])
    expect(getSelectedMovementRange({ ...state, selection: { kind: 'character', id: 'ally-2' } }, size))
      .toEqual(getMovementRange(ally2Position, 3, [ally1Position, enemy1Position], size))
  })
})
