import { prepareBattle } from './preparation.ts'
import { selectCharacter, type BoardState } from './selection.ts'

it.each(['none', 'cell', 'same', 'other'] as const)('設定対象は移動せず選択する: %s', (from) => {
  const battle = prepareBattle('1', '1')!
  const state: BoardState = Object.freeze({ ...battle, selection: from === 'none' ? { kind: 'none' as const }
    : from === 'cell' ? { kind: 'cell' as const, position: { x: 0, y: 0 } }
      : { kind: 'character' as const, id: from === 'same' ? 'ally-1' : 'enemy-1' } })
  const before = structuredClone(state)
  const result = selectCharacter(state, 'ally-1')
  expect(result.selection).toEqual({ kind: 'character', id: 'ally-1' })
  expect(result.characters).toBe(state.characters)
  expect(state).toEqual(before)
})

it('存在しないidは選択も駒も変えない', () => {
  const state = prepareBattle('1', '0')!
  expect(selectCharacter(state, 'missing')).toBe(state)
})
