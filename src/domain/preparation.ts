import { pieceLimits } from '../data/pieces.ts'
import { movementSetting } from '../data/movement.ts'
import type { Character, Side } from './character.ts'
import type { BoardState } from './selection.ts'

export interface BattleState extends BoardState {
  readonly phase: 'counts' | 'preparing' | 'active'
  readonly issued: Readonly<Record<Side, number>>
  /** 戦闘中に追加し、移動力をまだ確定していない駒。配置状態は各駒のpositionを使う。 */
  readonly pendingIds: readonly string[]
}

/** 承認された入力仕様: 前後空白を除く半角数字のみ、指定上限まで。 */
export function parseCount(input: string, maximum = pieceLimits.perSide): number | null {
  const trimmed = input.trim()
  if (!/^[0-9]+$/.test(trimmed)) return null
  const count = Number(trimmed)
  return count <= maximum ? count : null
}

/** ±の操作後の数。不正な入力や上限を超える操作はできない。 */
export function stepTokenCount(input: string, delta: -1 | 1, maximum = pieceLimits.perSide): number | null {
  const count = parseCount(input, maximum)
  return count === null ? null : parseCount(String(count + delta), maximum)
}

/** 双方0体の案内は、不正な入力への案内とは区別する。 */
export function areBothCountsZero(allyInput: string, enemyInput: string): boolean {
  return parseCount(allyInput) === 0 && parseCount(enemyInput) === 0
}

export function createInitialBattle(): BattleState {
  return { phase: 'counts', characters: [], selection: { kind: 'none' }, issued: { ally: 0, enemy: 0 }, pendingIds: [] }
}

/** 数指定から、移動力が初期値・未配置の駒を用意する（spec.md 2.2）。 */
export function prepareBattle(allyInput: string, enemyInput: string): BattleState | null {
  return addPieces({ ...createInitialBattle(), phase: 'preparing' }, allyInput, enemyInput)
}

export function canConfirmBattle(state: BattleState): boolean {
  return state.phase === 'preparing' && state.characters.length > 0
    && state.characters.every((character) => character.position !== null)
}

export function confirmBattle(state: BattleState): BattleState {
  return canConfirmBattle(state) ? { ...state, phase: 'active', selection: { kind: 'none' } } : state
}

const isMovement = (movement: number): boolean => Number.isInteger(movement)
  && movement >= movementSetting.min && movement <= movementSetting.max

/** 移動力の±の操作後の値。0〜9を超える操作はできない（#37）。 */
export function stepMovement(movement: number, delta: -1 | 1): number | null {
  const next = movement + delta
  return isMovement(next) ? next : null
}

/** 準備中または未確定の追加分だけ、指定した駒の移動力を0〜9の整数に変える。選択と位置は保つ（#37）。 */
export function setMovement(state: BattleState, id: string, movement: number): BattleState {
  if (!canEditMovement(state, id) || !isMovement(movement)) return state
  return {
    ...state,
    characters: state.characters.map((character) => character.id === id ? { ...character, movement } : character),
  }
}

/** 同時数の残枠と未発行番号の少ない方。表示・入力・追加判定で共有する。 */
export function getAdditionCapacity(state: BattleState, side: Side): number {
  const count = state.characters.filter((character) => character.side === side).length
  return Math.min(pieceLimits.perSide - count, pieceLimits.maxNumber - state.issued[side])
}

/** 発行履歴を進め、既存の配置・移動力・選択を保って未配置の駒を加える。 */
export function addPieces(state: BattleState, allyInput: string, enemyInput: string): BattleState | null {
  if (state.phase === 'counts') return null
  const ally = parseCount(allyInput, getAdditionCapacity(state, 'ally'))
  const enemy = parseCount(enemyInput, getAdditionCapacity(state, 'enemy'))
  if (ally === null || enemy === null || ally + enemy === 0) return null
  const make = (side: Side, count: number): Character[] => Array.from({ length: count }, (_, index) => {
    const number = state.issued[side] + index + 1
    return {
      id: `${side}-${number}`,
      name: `${side === 'ally' ? '味方' : '敵'}${number}`,
      side, number, movement: movementSetting.initial, position: null, fallen: false,
    }
  })
  const added = [...make('ally', ally), ...make('enemy', enemy)]
  return {
    ...state,
    characters: [...state.characters, ...added],
    issued: { ally: state.issued.ally + ally, enemy: state.issued.enemy + enemy },
    pendingIds: state.phase === 'active' ? [...state.pendingIds, ...added.map((character) => character.id)] : state.pendingIds,
  }
}

/** 倒れた状態だけを切り替え、配置・選択・移動力と戦闘の段階を保つ（#34）。 */
export function toggleFallen(state: BattleState, id: string): BattleState {
  return {
    ...state,
    characters: state.characters.map((character) => character.id === id
      ? { ...character, fallen: !character.fallen } : character),
  }
}

/** 駒と未確定IDを同じ遷移で削除。発行履歴・段階は戻さない。 */
export function removePiece(state: BattleState, id: string): BattleState {
  if (!state.characters.some((character) => character.id === id)) return state
  return {
    ...state,
    characters: state.characters.filter((character) => character.id !== id),
    pendingIds: state.pendingIds.filter((pendingId) => pendingId !== id),
    selection: { kind: 'none' },
  }
}

export function canConfirmAdditions(state: BattleState): boolean {
  return state.phase === 'active' && state.pendingIds.length > 0
    && state.pendingIds.every((id) => state.characters.some((character) => character.id === id && character.position !== null))
}

export function confirmAdditions(state: BattleState): BattleState {
  return canConfirmAdditions(state) ? { ...state, pendingIds: [], selection: { kind: 'none' } } : state
}

export function canEditMovement(state: BattleState, id: string): boolean {
  return state.characters.some((character) => character.id === id)
    && (state.phase === 'preparing' || (state.phase === 'active' && state.pendingIds.includes(id)))
}
