import type { Character } from './character.ts'
import type { BoardSize, Position } from './movement.ts'

/** 未選択・空きマス1つ・キャラ1体のいずれか（spec.md 2.1）。 */
export type Selection =
  | { readonly kind: 'none' }
  | { readonly kind: 'cell'; readonly position: Position }
  | { readonly kind: 'character'; readonly id: string }

export interface BoardState {
  readonly characters: readonly Character[]
  readonly selection: Selection
}

export function tapPosition(_state: BoardState, _position: Position, _boardSize: BoardSize): BoardState {
  throw new Error('未実装')
}

export function getSelectedMovementRange(_state: BoardState, _boardSize: BoardSize): Position[] {
  throw new Error('未実装')
}
