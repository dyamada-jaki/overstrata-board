import type { BoardState } from './selection.ts'

/** 数の指定 → 配置中 → 確定後（spec.md 2.2）。 */
export type BattleStage = 'counts' | 'placing' | 'confirmed'

export interface BattleState extends BoardState {
  readonly stage: BattleStage
}

export function parseTokenCount(input: string): number | null {
  void input
  return null
}

export function stepTokenCount(input: string, delta: 1 | -1): number | null {
  void input
  void delta
  return null
}

export function canPrepareTokens(allyCount: number | null, enemyCount: number | null): boolean {
  void allyCount
  void enemyCount
  return false
}

export function createBattle(): BattleState {
  return { stage: 'counts', characters: [], selection: { kind: 'none' } }
}

export function prepareTokens(state: BattleState, allyCount: number, enemyCount: number): BattleState {
  void allyCount
  void enemyCount
  return state
}

export function tapToken(state: BattleState, id: string): BattleState {
  void id
  return state
}

export function canConfirm(state: BattleState): boolean {
  void state
  return false
}

export function confirmPlacement(state: BattleState): BattleState {
  return state
}
