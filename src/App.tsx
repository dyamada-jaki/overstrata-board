import { useState } from 'react'
import Board from './components/Board.tsx'
import { boardSize } from './data/board.ts'
import type { Position } from './domain/movement.ts'
import { selectCell } from './domain/selection.ts'
import './App.css'

function App() {
  const [selected, setSelected] = useState<Position | null>(null)

  return (
    <main>
      <h1>Overstrata 戦闘ボード</h1>
      <Board
        size={boardSize}
        selected={selected}
        onCellClick={(position) => setSelected((current) => selectCell(current, position))}
      />
    </main>
  )
}

export default App
