import { useState } from 'react'
import { formatPosition, getBoardPositions } from '../domain/board.ts'
import type { Character, Side } from '../domain/character.ts'
import type { BoardSize, Position } from '../domain/movement.ts'
import { getSelectedMovementRange, tapPosition, type BoardState } from '../domain/selection.ts'
import './Board.css'

const sideLabels: Record<Side, string> = { ally: '味方', enemy: '敵' }

const keyOf = (position: Position) => `${position.x},${position.y}`

export function Board({ size, characters = [] }: { size: BoardSize; characters?: readonly Character[] }) {
  const [state, setState] = useState<BoardState>(() => ({ characters, selection: { kind: 'none' } }))
  const { selection } = state
  const occupants = new Map(state.characters.flatMap((character) => (
    character.position ? [[keyOf(character.position), character] as const] : []
  )))
  const range = new Set(getSelectedMovementRange(state, size).map(keyOf))
  const columns = { gridTemplateColumns: `repeat(${size.width}, minmax(0, 1fr))` }

  return (
    <div className="board" role="group" aria-label="戦闘盤面">
      <div className="board-columns" role="group" aria-label="横の座標" style={columns}>
        {Array.from({ length: size.width }, (_, x) => <span key={x}>{x + 1}</span>)}
      </div>
      <div
        className="board-rows"
        role="group"
        aria-label="縦の座標"
        style={{ gridTemplateRows: `repeat(${size.height}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: size.height }, (_, y) => <span key={y}>{y + 1}</span>)}
      </div>
      <div className="board-cells" style={columns}>
        {getBoardPositions(size).map((position) => {
          const key = keyOf(position)
          const occupant = occupants.get(key)
          const inRange = range.has(key)
          const selected = occupant
            ? selection.kind === 'character' && selection.id === occupant.id
            : selection.kind === 'cell' && keyOf(selection.position) === key
          const label = [
            `マス ${formatPosition(position)}`,
            occupant && `${occupant.name}（${sideLabels[occupant.side]}）`,
            inRange && '移動範囲',
          ].filter(Boolean).join(' ')

          return (
            <button
              key={key}
              type="button"
              className={inRange ? 'board-cell board-cell-range' : 'board-cell'}
              aria-label={label}
              aria-pressed={selected}
              onClick={() => setState((current) => tapPosition(current, position, size))}
            >
              {occupant && (
                <span className={`board-token board-token-${occupant.side}`}>{occupant.name}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
