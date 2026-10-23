import { BattleScreen } from './components/BattleScreen.tsx'
import './App.css'

function App() {
  return (
    <main>
      <h1>Overstrata 戦闘ボード</h1>
      <p>
        味方・敵の数を決めて「駒を用意する」を押し、一覧の駒を選んで空きマスをタップすると配置します。
        すべて置いたら「確定」を押します。駒を選択中に空きマスをタップすると移動します（薄い色は移動範囲の目安です）。
        同じものをもう一度タップすると選択を解除します。
      </p>
      <BattleScreen />
    </main>
  )
}

export default App
