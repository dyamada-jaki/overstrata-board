import { useState } from 'react'
import { tapCell } from '../domain/battle.ts'
import type { BattleState, Character } from '../domain/character.ts'
import { getMovement, getMovementRange, type BoardSize } from '../domain/movement.ts'
import { Board } from './Board.tsx'

export function BattleBoard({ size, initialCharacters }: {
  size: BoardSize
  initialCharacters: readonly Character[]
}) {
  const [state, setState] = useState<BattleState>({
    characters: initialCharacters,
    selection: { kind: 'none' },
  })
  const { characters, selection } = state
  const selectedCharacter = selection.kind === 'character'
    ? characters.find((character) => character.id === selection.id)
    : undefined
  const range = selectedCharacter
    ? getMovementRange(selectedCharacter.position, getMovement(selectedCharacter.armor),
      characters.filter((character) => character.id !== selectedCharacter.id)
        .map((character) => character.position), size)
    : []

  return (
    <Board
      size={size}
      characters={characters}
      selection={selection}
      range={range}
      onCellClick={(position) => setState((current) => tapCell(current, position, size))}
    />
  )
}
