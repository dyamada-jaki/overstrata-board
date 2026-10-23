import { battleRules } from '../data/battle.ts'
import type { Character, Side } from './character.ts'
import type { BoardState } from './selection.ts'

/** 数の指定 → 配置中 → 確定後（spec.md 2.2）。 */
export type BattleStage = 'counts' | 'placing' | 'confirmed'

/** 戦闘の準備の段階と、盤面の駒・選択。 */
export interface BattleState extends BoardState {
  readonly stage: BattleStage
}

const sideNames: Record<Side, string> = { ally: '味方', enemy: '敵' }

function isTokenCount(count: number): boolean {
  return Number.isInteger(count) && count >= 0 && count <= battleRules.maxTokensPerSide
}

/** 入力欄の文字列を駒の数にする。前後の空白を除いた半角数字で0〜10の整数だけを受け付け、それ以外は null。 */
export function parseTokenCount(input: string): number | null {
  const text = input.trim()
  if (!/^\d+$/.test(text)) return null
  const count = Number(text)
  return isTokenCount(count) ? count : null
}

/** 「−」「＋」を押した後の数。入力が不正なとき、または0〜10を超えるときは押せないので null。 */
export function stepTokenCount(input: string, delta: 1 | -1): number | null {
  const count = parseTokenCount(input)
  if (count === null) return null
  const next = count + delta
  return isTokenCount(next) ? next : null
}

/** 両方の数が0〜10の整数で、どちらかが1体以上なら駒を用意できる。 */
export function canPrepareTokens(allyCount: number | null, enemyCount: number | null): boolean {
  if (allyCount === null || enemyCount === null) return false
  return isTokenCount(allyCount) && isTokenCount(enemyCount) && allyCount + enemyCount > 0
}

/** 最初の準備画面の状態。準備のやり直し・新しい戦闘でもここへ戻す。 */
export function createBattle(): BattleState {
  return { stage: 'counts', characters: [], selection: { kind: 'none' } }
}

function createTokens(side: Side, count: number): Character[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${side}-${index + 1}`,
    name: `${sideNames[side]}${index + 1}`,
    side,
    number: index + 1,
    movement: battleRules.tokenMovement,
    position: null,
  }))
}

/** 数の指定の段階で、味方→敵の番号順に未配置の駒を用意する。用意できない数や段階では変えない。 */
export function prepareTokens(state: BattleState, allyCount: number, enemyCount: number): BattleState {
  if (state.stage !== 'counts' || !canPrepareTokens(allyCount, enemyCount)) return state
  return {
    stage: 'placing',
    characters: [...createTokens('ally', allyCount), ...createTokens('enemy', enemyCount)],
    selection: { kind: 'none' },
  }
}

/** 未配置一覧の駒を押す。選択中の駒なら解除し、それ以外は配置・移動せずその駒だけを選択する。 */
export function tapToken(state: BattleState, id: string): BattleState {
  const { selection } = state
  const deselect = selection.kind === 'character' && selection.id === id
  return { ...state, selection: deselect ? { kind: 'none' } : { kind: 'character', id } }
}

/** 配置中で、用意した全駒が盤面にあるときだけ確定できる。 */
export function canConfirm(state: BattleState): boolean {
  return state.stage === 'placing'
    && state.characters.length > 0
    && state.characters.every((character) => character.position !== null)
}

/** 準備を確定する。配置はそのまま引き継ぎ、選択と移動範囲の表示を解除する。 */
export function confirmPlacement(state: BattleState): BattleState {
  if (!canConfirm(state)) return state
  return { ...state, stage: 'confirmed', selection: { kind: 'none' } }
}
