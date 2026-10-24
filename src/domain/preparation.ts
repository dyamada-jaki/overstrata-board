import { movementSetting } from '../data/movement.ts'
import { tokenLimits } from '../data/tokens.ts'
import type { Character, Side } from './character.ts'
import type { BoardState } from './selection.ts'

export interface BattleState extends BoardState {
  readonly phase: 'counts' | 'preparing' | 'active'
  /** 各陣営で最後に発行した番号。削除では戻さず、全体のクリアでだけ0に戻す（#33）。 */
  readonly issued: Readonly<Record<Side, number>>
}

/** 承認された入力仕様: 前後空白を除く半角数字のみ、0〜10。 */
export function parseCount(input: string, max: number = tokenLimits.perSide): number | null {
  void max
  const trimmed = input.trim()
  if (!/^[0-9]+$/.test(trimmed)) return null
  const count = Number(trimmed)
  return count <= 10 ? count : null
}

/** ±の操作後の数。不正な入力や0〜10を超える操作はできない。 */
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

/** 数指定から、移動力が初期値・未配置の駒を用意する（spec.md 2.2）。 */
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
      movement: movementSetting.initial,
      position: null,
      confirmed: false,
    }
  })
  return {
    phase: 'preparing',
    characters: [...make('ally', ally), ...make('enemy', enemy)],
    selection: { kind: 'none' },
    issued: { ally: 0, enemy: 0 },
  }
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

/** 準備中だけ、指定した駒の移動力を0〜9の整数に変える。選択と位置は保つ（#37）。 */
export function setMovement(state: BattleState, id: string, movement: number): BattleState {
  if (state.phase !== 'preparing' || !isMovement(movement)) return state
  if (!state.characters.some((character) => character.id === id)) return state
  return {
    ...state,
    characters: state.characters.map((character) => character.id === id ? { ...character, movement } : character),
  }
}

// 以下は #33 の枠だけ（テスト先行のため未実装）。
export function getAddableCount(state: BattleState, side: Side): number {
  void state
  void side
  return 0
}

export function prepareAdditions(state: BattleState, allyInput: string, enemyInput: string): BattleState | null {
  void state
  void allyInput
  void enemyInput
  return null
}

export function deleteCharacter(state: BattleState, id: string): BattleState {
  void id
  return state
}

export function canConfirmAdditions(state: BattleState): boolean {
  void state
  return false
}

export function confirmAdditions(state: BattleState): BattleState {
  return state
}
