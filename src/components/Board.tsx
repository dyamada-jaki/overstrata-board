import { formatPosition, getBoardPositions } from '../domain/board.ts'
import { getMovement, type BoardSize, type Position } from '../domain/movement.ts'
import type { BoardSelection, Character } from '../domain/character.ts'
import './Board.css'

const armorNames = { light: '軽装', medium: '中装', heavy: '重装' }

export function Board({ size, characters, selection, range, onCellClick }: {
  size: BoardSize
  characters: readonly Character[]
  selection: BoardSelection
  range: readonly Position[]
  onCellClick: (position: Position) => void
}) {
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
          const character = characters.find((candidate) => (
            candidate.position.x === position.x && candidate.position.y === position.y
          ))
          const selected = selection.kind === 'cell'
            ? selection.position.x === position.x && selection.position.y === position.y
            : selection.kind === 'character' && selection.id === character?.id
          const inRange = range.some((candidate) => candidate.x === position.x && candidate.y === position.y)
          const label = `マス ${formatPosition(position)}`
          return (
            <button
              key={`${position.x},${position.y}`}
              type="button"
              className="board-cell"
              aria-label={character
                ? `${label} ${character.name} ${character.side === 'ally' ? '味方' : '敵'} ${armorNames[character.armor]} 移動力${getMovement(character.armor)}`
                : label}
              aria-pressed={selected}
              aria-description={inRange ? '移動範囲' : undefined}
              onClick={() => onCellClick(position)}
            >
              {character && (
                <span className={`token token-${character.side}`} aria-hidden="true">
                  {character.name.slice(-1)}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
