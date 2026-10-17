import { useState } from 'react'
import { formatPosition, getBoardPositions } from '../domain/board.ts'
import type { BoardSize, Position } from '../domain/movement.ts'
import './Board.css'

export function Board({ size }: { size: BoardSize }) {
  const [selected, setSelected] = useState<Position | null>(null)
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
        {getBoardPositions(size).map((position) => (
          <button
            key={`${position.x},${position.y}`}
            type="button"
            className="board-cell"
            aria-label={`マス ${formatPosition(position)}`}
            aria-pressed={selected?.x === position.x && selected.y === position.y}
            onClick={() => setSelected((current) => (
              current?.x === position.x && current.y === position.y ? null : position
            ))}
          />
        ))}
      </div>
    </div>
  )
}
