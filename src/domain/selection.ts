import type { Character } from './character.ts'
import { canMoveTo, getMovement, getMovementRange, type BoardSize, type Position } from './movement.ts'

/** 未選択・空きマス1つ・キャラ1体のいずれか（spec.md 2.1）。 */
export type Selection =
  | { readonly kind: 'none' }
  | { readonly kind: 'cell'; readonly position: Position }
  | { readonly kind: 'character'; readonly id: string }

/** 盤面のキャラと選択。マスとキャラの選択を別々に持たず、1つの Selection で表す。 */
export interface BoardState {
  readonly characters: readonly Character[]
  readonly selection: Selection
}

const none: Selection = { kind: 'none' }

function isSame(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y
}

/**
 * 盤面のマスを押したときの次の状態（spec.md 2.1・2.3）。キャラのいるマスはキャラを押したとみなす。
 * キャラ選択中に空きマスを押すと、移動範囲の内外を問わず移動して選択を解除する。
 */
export function tapPosition(state: BoardState, position: Position, boardSize: BoardSize): BoardState {
  const { characters, selection } = state
  const tapped = characters.find((character) => isSame(character.position, position))

  if (tapped) {
    const deselect = selection.kind === 'character' && selection.id === tapped.id
    return { characters, selection: deselect ? none : { kind: 'character', id: tapped.id } }
  }

  if (selection.kind === 'character') {
    const occupied = characters.map((character) => character.position)
    if (!canMoveTo(position, occupied, boardSize)) return state
    return {
      characters: characters.map((character) => (
        character.id === selection.id ? { ...character, position } : character
      )),
      selection: none,
    }
  }

  const deselect = selection.kind === 'cell' && isSame(selection.position, position)
  return { characters, selection: deselect ? none : { kind: 'cell', position } }
}

/** 選択中のキャラの移動範囲。キャラを選択していなければ空。 */
export function getSelectedMovementRange(state: BoardState, boardSize: BoardSize): Position[] {
  const { characters, selection } = state
  if (selection.kind !== 'character') return []

  const selected = characters.find((character) => character.id === selection.id)
  if (!selected) return []
  const others = characters
    .filter((character) => character.id !== selected.id)
    .map((character) => character.position)
  return getMovementRange(selected.position, getMovement(selected.armor), others, boardSize)
}
