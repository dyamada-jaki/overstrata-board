import type { Character, Side } from './character.ts'
import type { BoardState } from './selection.ts'

export interface BattleState extends BoardState {
  readonly phase: 'counts' | 'preparing' | 'active'
}

/** 承認された入力仕様: 前後空白を除く半角数字のみ、0〜10。 */
export function parseCount(input: string): number | null {
  const trimmed = input.trim()
  if (!/^[0-9]+$/.test(trimmed)) return null
  const count = Number(trimmed)
  return count <= 10 ? count : null
}

export function createInitialBattle(): BattleState {
  return { phase: 'counts', characters: [], selection: { kind: 'none' } }
}

/** 数指定から、移動力5・未配置の駒を用意する（spec.md 2.2）。 */
export function prepareBattle(allyInput: string, enemyInput: string): BattleState | null {
  const ally = parseCount(allyInput)
  const enemy = parseCount(enemyInput)
  if (ally === null || enemy === null || ally + enemy === 0) return null
  const make = (side: Side, count: number): Character[] => Array.from({ length: count }, (_, index) => {
    const number = index + 1
    return {
      id: `${side}-${number}`,
      name: `${side === 'ally' ? '味方' : '敵'}${number}`,
      side,
      number,
      movement: 5,
      position: null,
    }
  })
  return {
    phase: 'preparing',
    characters: [...make('ally', ally), ...make('enemy', enemy)],
    selection: { kind: 'none' },
  }
}

export function canConfirmBattle(state: BattleState): boolean {
  return state.phase === 'preparing' && state.characters.length > 0
    && state.characters.every((character) => character.position !== null)
}

export function confirmBattle(state: BattleState): BattleState {
  return canConfirmBattle(state) ? { ...state, phase: 'active', selection: { kind: 'none' } } : state
}
