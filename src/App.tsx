import { Board } from './components/Board.tsx'
import { boardSize } from './data/board.ts'
import './App.css'

function App() {
  return (
    <main>
      <h1>Overstrata 戦闘ボード</h1>
      <p>マスをタップして選択します。同じマスをもう一度タップすると解除します。</p>
      <Board size={boardSize} />
    </main>
  )
}

export default App
