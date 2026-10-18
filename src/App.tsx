import { BattleBoard } from './components/BattleBoard.tsx'
import { sampleCharacters } from './data/characters.ts'
import { boardSize } from './data/board.ts'
import './App.css'

function App() {
  return (
    <main>
      <h1>Overstrata 戦闘ボード</h1>
      <p>コマを選び、空きマスをタップして移動します。薄い色は移動範囲の目安です。範囲外にも移動できます。</p>
      <p className="board-legend"><span className="legend-ally">青：味方</span> ／ <span className="legend-enemy">赤：敵</span> 同じコマ・マスを再タップで解除</p>
      <BattleBoard size={boardSize} initialCharacters={sampleCharacters} />
    </main>
  )
}

export default App
