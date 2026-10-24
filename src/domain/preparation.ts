import { movementSetting } from '../data/movement.ts'
import { tokenLimits } from '../data/tokens.ts'
import type { Character, Side } from './character.ts'
import type { BoardState } from './selection.ts'

export interface BattleState extends BoardState {
  readonly phase: 'counts' | 'preparing' | 'active'
  /** 各陣営で最後に発行した番号。削除では戻さず、全体のクリアでだけ0に戻す（#33）。 */
  readonly issued: Readonly<Record<Side, number>>
}

/** 承認された入力仕様: 前後空白を除く半角数字のみ、0〜上限（既定は同時数の上限）。 */
export function parseCount(input: string, max: number = tokenLimits.perSide): number | null {
  const trimmed = input.trim()
  if (!/^[0-9]+$/.test(trimmed)) return null
  const count = Number(trimmed)
  return count <= max ? count : null
}

/** ±の操作後の数。不正な入力や0〜上限を超える操作はできない。 */
export function stepTokenCount(input: string, delta: -1 | 1, max: number = tokenLimits.perSide): number | null {
  const count = parseCount(input, max)
  return count === null ? null : parseCount(String(count + delta), max)
}

/** 双方0体の案内は、不正な入力への案内とは区別する。 */
export function areBothCountsZero(allyInput: string, enemyInput: string): boolean {
  return parseCount(allyInput) === 0 && parseCount(enemyInput) === 0
}

export function createInitialBattle(): BattleState {
  return { phase: 'counts', characters: [], selection: { kind: 'none' }, issued: { ally: 0, enemy: 0 } }
}

const sideNames: Record<Side, string> = { ally: '味方', enemy: '敵' }

/** 発行済みの番号の続きから、移動力が初期値・未配置・未確定の駒を作る。 */
function issue(side: Side, issued: number, count: number): Character[] {
  return Array.from({ length: count }, (_, index) => {
    const number = issued + index + 1
    return {
      id: `${side}-${number}`,
      name: `${sideNames[side]}${number}`,
      side,
      number,
      movement: movementSetting.initial,
      position: null,
      confirmed: false,
    }
  })
}

/** 数指定から、移動力が初期値・未配置の駒を用意する（spec.md 2.2）。 */
export function prepareBattle(allyInput: string, enemyInput: string): BattleState | null {
  const ally = parseCount(allyInput)
  const enemy = parseCount(enemyInput)
  if (ally === null || enemy === null || ally + enemy === 0) return null
  return {
    phase: 'preparing',
    characters: [...issue('ally', 0, ally), ...issue('enemy', 0, enemy)],
    selection: { kind: 'none' },
    issued: { ally, enemy },
  }
}

/** あと何体追加できるか。同時数の残り枠と、番号の上限までの残り番号の少ない方（#33）。 */
export function getAddableCount(state: BattleState, side: Side): number {
  const current = state.characters.filter((character) => character.side === side).length
  return Math.max(0, Math.min(tokenLimits.perSide - current, tokenLimits.maxNumber - state.issued[side]))
}

/** 指定数の駒を続きの番号で未配置一覧へ加える。既存の駒と選択は保つ。不正・双方0・上限超過は null（#33）。 */
export function prepareAdditions(state: BattleState, allyInput: string, enemyInput: string): BattleState | null {
  if (state.phase === 'counts') return null
  const ally = parseCount(allyInput, getAddableCount(state, 'ally'))
  const enemy = parseCount(enemyInput, getAddableCount(state, 'enemy'))
  if (ally === null || enemy === null || ally + enemy === 0) return null
  return {
    ...state,
    characters: [...state.characters, ...issue('ally', state.issued.ally, ally), ...issue('enemy', state.issued.enemy, enemy)],
    issued: { ally: state.issued.ally + ally, enemy: state.issued.enemy + enemy },
  }
}

/** 1体を削除し、選択と移動範囲を解除する。段階と番号の発行状況は保つ（#33）。 */
export function deleteCharacter(state: BattleState, id: string): BattleState {
  if (!state.characters.some((character) => character.id === id)) return state
  return {
    ...state,
    characters: state.characters.filter((character) => character.id !== id),
    selection: { kind: 'none' },
  }
}

export function canConfirmBattle(state: BattleState): boolean {
  return state.phase === 'preparing' && state.characters.length > 0
    && state.characters.every((character) => character.position !== null)
}

const confirmAll = (characters: readonly Character[]): Character[] =>
  characters.map((character) => character.confirmed ? character : { ...character, confirmed: true })

export function confirmBattle(state: BattleState): BattleState {
  return canConfirmBattle(state)
    ? { ...state, phase: 'active', characters: confirmAll(state.characters), selection: { kind: 'none' } }
    : state
}

/** 戦闘中の未確定の追加分が1体以上あり、すべて配置済みなら確定できる（#33）。 */
export function canConfirmAdditions(state: BattleState): boolean {
  const pending = state.characters.filter((character) => !character.confirmed)
  return state.phase === 'active' && pending.length > 0 && pending.every((character) => character.position !== null)
}

/** 未確定の追加分をまとめて確定し、選択と移動範囲を解除する（#33）。 */
export function confirmAdditions(state: BattleState): BattleState {
  return canConfirmAdditions(state)
    ? { ...state, characters: confirmAll(state.characters), selection: { kind: 'none' } }
    : state
}

/** 移動力を変えられるのは未確定の駒だけ。準備中は全駒、戦闘中は追加分（#37・#33）。 */
export function canEditMovement(state: BattleState, id: string): boolean {
  return state.characters.some((character) => character.id === id && !character.confirmed)
}

const isMovement = (movement: number): boolean => Number.isInteger(movement)
  && movement >= movementSetting.min && movement <= movementSetting.max

/** 移動力の±の操作後の値。0〜9を超える操作はできない（#37）。 */
export function stepMovement(movement: number, delta: -1 | 1): number | null {
  const next = movement + delta
  return isMovement(next) ? next : null
}

/** 未確定の駒だけ、移動力を0〜9の整数に変える。選択と位置は保つ（#37・#33）。 */
export function setMovement(state: BattleState, id: string, movement: number): BattleState {
  if (!canEditMovement(state, id) || !isMovement(movement)) return state
  return {
    ...state,
    characters: state.characters.map((character) => character.id === id ? { ...character, movement } : character),
  }
}
