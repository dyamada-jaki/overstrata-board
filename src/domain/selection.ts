import type { Character } from './character.ts'
import { canMoveTo, getMovementRange, type BoardSize, type Position } from './movement.ts'

/** 未選択・空きマス1つ・未配置または配置済みのキャラ1体（spec.md 2.1・2.2）。 */
export type Selection =
  | { readonly kind: 'none' }
  | { readonly kind: 'cell'; readonly position: Position }
  | { readonly kind: 'character'; readonly id: string }

export interface BoardState {
  readonly characters: readonly Character[]
  readonly selection: Selection
}

const none: Selection = { kind: 'none' }
const isSame = (a: Position, b: Position): boolean => a.x === b.x && a.y === b.y

/** 未配置・配置済み共通の選択。別の駒では選択だけを切り替える。 */
export function tapCharacter(state: BoardState, id: string): BoardState {
  if (!state.characters.some((character) => character.id === id)) return state
  const deselect = state.selection.kind === 'character' && state.selection.id === id
  return { characters: state.characters, selection: deselect ? none : { kind: 'character', id } }
}

/** 空きマスで選択駒を配置/移動。範囲外でも移動でき、直後は何も選択しない。 */
export function tapPosition(state: BoardState, position: Position, boardSize: BoardSize): BoardState {
  const { characters, selection } = state
  const tapped = characters.find((character) => character.position !== null && isSame(character.position, position))
  if (tapped) return tapCharacter(state, tapped.id)

  const occupied = characters.flatMap((character) => character.position === null ? [] : [character.position])
  if (!canMoveTo(position, occupied, boardSize)) return state

  if (selection.kind === 'character') {
    const selected = characters.find((character) => character.id === selection.id)
    // 初回配置は倒れていても可能。配置済みの移動だけを止め、選択と範囲を保つ。
    if (selected?.fallen && selected.position !== null) return state
    return {
      characters: characters.map((character) => character.id === selection.id ? { ...character, position } : character),
      selection: none,
    }
  }
  const deselect = selection.kind === 'cell' && isSame(selection.position, position)
  return { characters, selection: deselect ? none : { kind: 'cell', position } }
}

/** 未配置の駒・マス・未選択では範囲を出さない。占有と盤面外を除く。 */
export function getSelectedMovementRange(state: BoardState, boardSize: BoardSize): Position[] {
  const { characters, selection } = state
  if (selection.kind !== 'character') return []
  const selected = characters.find((character) => character.id === selection.id)
  if (!selected || selected.position === null) return []
  const others = characters.filter((character) => character.id !== selected.id)
    .flatMap((character) => character.position === null ? [] : [character.position])
  return getMovementRange(selected.position, selected.movement, others, boardSize)
}
