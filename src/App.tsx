import { BattleScreen } from './components/BattleScreen.tsx'
import './App.css'

function App() {
  return (
    <main>
      <h1>Overstrata 戦闘ボード</h1>
      <p>
        マスやキャラをタップして選択します。同じものをもう一度タップすると解除します。
        キャラを選択中に空きマスをタップすると、そのマスへ移動します（薄い色は移動範囲の目安です）。
      </p>
      <BattleScreen />
    </main>
  )
}

export default App
