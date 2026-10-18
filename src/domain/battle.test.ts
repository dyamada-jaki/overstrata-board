import { tapCell } from './battle.ts'
import type { BattleState } from './character.ts'

describe('tapCellの移動（spec.md 2.3）', () => {
  const state: BattleState = Object.freeze({
    characters: Object.freeze([
      Object.freeze({ id: 'ally', name: '味方1', side: 'ally' as const, armor: 'light' as const,
        position: Object.freeze({ x: 0, y: 0 }) }),
    ]),
    selection: Object.freeze({ kind: 'character' as const, id: 'ally' }),
  })

  it.each([{ x: -1, y: 0 }, { x: 3, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 2 }])(
    '盤面外$x,$yへの移動で位置と選択を変えない', (position) => {
      expect(tapCell(state, position, { width: 3, height: 2 })).toEqual(state)
    },
  )

  it('移動結果を返しても入力のキャラ・位置・選択は変更しない', () => {
    const expected = {
      characters: [{ id: 'ally', name: '味方1', side: 'ally', armor: 'light', position: { x: 2, y: 1 } }],
      selection: { kind: 'none' },
    }
    expect(tapCell(state, { x: 2, y: 1 }, { width: 3, height: 2 })).toEqual(expected)
    expect(tapCell(state, { x: 2, y: 1 }, { width: 3, height: 2 })).toEqual(expected)
    expect(state.characters[0]?.position).toEqual({ x: 0, y: 0 })
    expect(state.selection).toEqual({ kind: 'character', id: 'ally' })
  })
})
