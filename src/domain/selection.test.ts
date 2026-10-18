import type { Character } from './character.ts'
import { getMovementRange } from './movement.ts'
import { getSelectedMovementRange, tapPosition, type BoardState } from './selection.ts'

// spec.md 2.2 のサンプルと同じ配置（内部座標）。
const ally1: Character = { id: 'ally-1', name: '味方1', side: 'ally', armor: 'light', position: { x: 2, y: 7 } }
const ally2: Character = { id: 'ally-2', name: '味方2', side: 'ally', armor: 'heavy', position: { x: 5, y: 8 } }
const enemy1: Character = { id: 'enemy-1', name: '敵1', side: 'enemy', armor: 'medium', position: { x: 3, y: 2 } }
const characters = [ally1, ally2, enemy1]
const size = { width: 10, height: 10 }

function stateOf(selection: BoardState['selection']): BoardState {
  return Object.freeze({ characters: Object.freeze([...characters]), selection: Object.freeze(selection) })
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
    expect(tapPosition(stateOf(selection), ally1.position, size))
      .toEqual({ characters, selection: { kind: 'character', id: 'ally-1' } })
  })

  it('キャラ選択中に同じキャラを押すと、位置を変えず解除する', () => {
    expect(tapPosition(stateOf({ kind: 'character', id: 'ally-1' }), ally1.position, size))
      .toEqual({ characters, selection: { kind: 'none' } })
  })

  it('キャラ選択中に別キャラを押すと、誰も移動せず選択だけを切り替える', () => {
    expect(tapPosition(stateOf({ kind: 'character', id: 'ally-1' }), enemy1.position, size))
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

describe('getSelectedMovementRange', () => {
  it('キャラ以外を選択中・未選択では範囲を出さない', () => {
    expect(getSelectedMovementRange(stateOf({ kind: 'none' }), size)).toEqual([])
    expect(getSelectedMovementRange(stateOf({ kind: 'cell', position: { x: 0, y: 0 } }), size)).toEqual([])
  })

  it('選択中のキャラの装備による移動力で、他キャラのマスを除いた #7 の範囲を返す', () => {
    // 味方2は重装で移動力3。
    expect(getSelectedMovementRange(stateOf({ kind: 'character', id: 'ally-2' }), size))
      .toEqual(getMovementRange(ally2.position, 3, [ally1.position, enemy1.position], size))
    // 味方1から敵1までは距離5だが、敵1のマスは含まない。
    const range = getSelectedMovementRange(stateOf({ kind: 'character', id: 'ally-1' }), size)
    expect(range).toContainEqual({ x: 2, y: 2 })
    expect(range).not.toContainEqual(enemy1.position)
    expect(range).not.toContainEqual(ally1.position)
  })
})
