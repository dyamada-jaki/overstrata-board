import { formatPosition, getBoardPositions } from '../domain/board.ts'
import type { BoardSize, Position } from '../domain/movement.ts'
import { getSelectedMovementRange, type BoardState } from '../domain/selection.ts'
import { pieceDetails, tokenClass } from './piece.ts'
import './Board.css'

const keyOf = (position: Position) => `${position.x},${position.y}`

export function Board({ size, state, onTap }: {
  size: BoardSize
  state: BoardState
  onTap: (position: Position) => void
}) {
  const { selection } = state
  const occupants = new Map(state.characters.flatMap((character) => character.position === null
    ? [] : [[keyOf(character.position), character] as const]))
  const range = new Set(getSelectedMovementRange(state, size).map(keyOf))
  const columns = { gridTemplateColumns: `repeat(${size.width}, minmax(0, 1fr))` }

  return (
    <div className="board" role="group" aria-label="戦闘盤面">
      <div className="board-columns" role="group" aria-label="横の座標" style={columns}>
        {Array.from({ length: size.width }, (_, x) => <span key={x}>{x + 1}</span>)}
      </div>
      <div className="board-rows" role="group" aria-label="縦の座標"
        style={{ gridTemplateRows: `repeat(${size.height}, minmax(0, 1fr))` }}>
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
            occupant && `${occupant.name}（${pieceDetails(occupant)}）`,
            inRange && '移動範囲',
          ].filter(Boolean).join(' ')
          return (
            <button key={key} type="button"
              className={inRange ? 'board-cell board-cell-range' : 'board-cell'}
              aria-label={label} aria-pressed={selected} onClick={() => onTap(position)}>
              {occupant && <span className={tokenClass(occupant)}>{occupant.number}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
