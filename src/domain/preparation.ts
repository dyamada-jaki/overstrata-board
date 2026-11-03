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

/** 駒数として指定できるか: 0〜上限の整数（#46 で数は「−」「＋」だけで指定する）。 */
const isCount = (count: number, maximum: number): boolean => Number.isInteger(count) && count >= 0 && count <= maximum

/** ±の操作後の数。0未満や上限を超える操作はできない（spec.md 2.2 #46）。 */
export function stepTokenCount(count: number, delta: -1 | 1, maximum = pieceLimits.perSide): number | null {
  const next = count + delta
  return isCount(next, maximum) ? next : null
}

/** 双方0体では進めず、案内を出す。 */
export function areBothCountsZero(ally: number, enemy: number): boolean {
  return ally === 0 && enemy === 0
}

export function createInitialBattle(): BattleState {
  return { phase: 'counts', characters: [], selection: { kind: 'none' }, issued: { ally: 0, enemy: 0 }, pendingIds: [] }
}

/** 数指定から、移動力が初期値・未配置の駒を用意する（spec.md 2.2）。 */
export function prepareBattle(ally: number, enemy: number): BattleState | null {
  return addPieces({ ...createInitialBattle(), phase: 'preparing' }, ally, enemy)
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
export function addPieces(state: BattleState, ally: number, enemy: number): BattleState | null {
  if (state.phase === 'counts') return null
  if (!isCount(ally, getAdditionCapacity(state, 'ally')) || !isCount(enemy, getAdditionCapacity(state, 'enemy'))) return null
  if (areBothCountsZero(ally, enemy)) return null
  const make = (side: Side, count: number): Character[] => Array.from({ length: count }, (_, index) => {
    const number = state.issued[side] + index + 1
    return {
      id: `${side}-${number}`,
      name: `${side === 'ally' ? '味方' : '敵'}${number}`,
      side, number, movement: movementSetting.initial, position: null, downed: false,
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

/** 指定した駒だけ倒れた状態と通常を切り替える。位置・移動力・選択は保つ（#34）。 */
export function toggleDowned(state: BattleState, id: string): BattleState {
  return {
    ...state,
    characters: state.characters.map((character) => character.id === id ? { ...character, downed: !character.downed } : character),
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
