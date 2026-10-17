import { formatPosition } from '../domain/coordinate.ts'
import type { BoardSize, Position } from '../domain/movement.ts'
import './Board.css'

interface BoardProps {
  readonly size: BoardSize
  readonly selected: Position | null
  readonly onCellClick: (position: Position) => void
}

function range(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index)
}

function Board({ size, selected, onCellClick }: BoardProps) {
  const columns = range(size.width)

  return (
    <table className="board" aria-label="盤面">
      <thead>
        <tr>
          <td className="board-corner" />
          {columns.map((x) => (
            <th key={x} scope="col" className="board-label">{x + 1}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {range(size.height).map((y) => (
          <tr key={y}>
            <th scope="row" className="board-label">{y + 1}</th>
            {columns.map((x) => {
              const position = { x, y }
              const isSelected = selected?.x === x && selected.y === y
              return (
                <td key={x} className="board-cell">
                  <button
                    type="button"
                    aria-label={formatPosition(position)}
                    aria-pressed={isSelected}
                    onClick={() => onCellClick(position)}
                  />
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default Board
