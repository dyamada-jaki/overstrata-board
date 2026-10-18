import type { BattleState } from './character.ts'
import { canMoveTo, type BoardSize, type Position } from './movement.ts'

/** 盤面のマスタップ。占有マスでは選択のみ、空きマスでは選択または移動を行う。 */
export function tapCell(state: BattleState, position: Position, size: BoardSize): BattleState {
  const { characters, selection } = state
  const occupant = characters.find((character) => (
    character.position.x === position.x && character.position.y === position.y
  ))
  if (occupant) {
    return {
      characters,
      selection: selection.kind === 'character' && selection.id === occupant.id
        ? { kind: 'none' }
        : { kind: 'character', id: occupant.id },
    }
  }

  if (selection.kind === 'character') {
    const otherPositions = characters.filter((character) => character.id !== selection.id)
      .map((character) => character.position)
    if (!canMoveTo(position, otherPositions, size)) return state
    return {
      characters: characters.map((character) => character.id === selection.id
        ? { ...character, position }
        : character),
      selection: { kind: 'none' },
    }
  }

  return {
    characters,
    selection: selection.kind === 'cell'
      && selection.position.x === position.x && selection.position.y === position.y
      ? { kind: 'none' }
      : { kind: 'cell', position },
  }
}
