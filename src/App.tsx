import { Board } from './components/Board.tsx'
import { boardSize } from './data/board.ts'
import { sampleCharacters } from './data/characters.ts'
import './App.css'

function App() {
  return (
    <main>
      <h1>Overstrata 戦闘ボード</h1>
      <p>
        マスやキャラをタップして選択します。同じものをもう一度タップすると解除します。
        キャラを選択中に空きマスをタップすると、そのマスへ移動します（薄い色は移動範囲の目安です）。
      </p>
      <Board size={boardSize} characters={sampleCharacters} />
    </main>
  )
}

export default App
