import type { BoardSize, Position } from '../domain/movement.ts'

interface BoardProps {
  readonly size: BoardSize
  readonly selected: Position | null
  readonly onCellClick: (position: Position) => void
}

function Board({ size, selected, onCellClick }: BoardProps) {
  void size
  void selected
  void onCellClick
  return <table aria-label="盤面" />
}

export default Board
