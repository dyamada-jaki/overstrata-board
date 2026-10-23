import type { BoardState } from './selection.ts'

export interface BattleState extends BoardState {
  readonly phase: 'counts' | 'preparing' | 'active'
}

// テスト先行用の空枠。振る舞いは次の実装コミットで追加する。
export function parseCount(_input: string): number | null { return null }
export function createInitialBattle(): BattleState { throw new Error('未実装') }
export function prepareBattle(_ally: string, _enemy: string): BattleState | null { return null }
export function canConfirmBattle(_state: BattleState): boolean { return false }
export function confirmBattle(state: BattleState): BattleState { return state }
