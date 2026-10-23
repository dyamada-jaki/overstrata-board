import { useState } from 'react'
import { Board } from './components/Board.tsx'
import { boardSize } from './data/board.ts'
import { canConfirmBattle, confirmBattle, createInitialBattle, parseCount, prepareBattle } from './domain/preparation.ts'
import { tapCharacter, tapPosition } from './domain/selection.ts'
import './App.css'

function CountInput({ side, value, onChange }: { side: '味方' | '敵'; value: string; onChange: (value: string) => void }) {
  const count = parseCount(value)
  const id = side === '味方' ? 'ally-count' : 'enemy-count'
  return (
    <div className="count-field">
      <label htmlFor={id}>{side}の数</label>
      <div className="count-controls">
        <button type="button" aria-label={`${side}の数を減らす`} disabled={count === null || count === 0}
          onClick={() => { if (count !== null) onChange(String(count - 1)) }}>−</button>
        <input id={id} type="text" inputMode="numeric" value={value}
          aria-invalid={count === null} aria-describedby={count === null ? `${id}-error` : 'count-help'}
          onChange={(event) => onChange(event.target.value)} />
        <button type="button" aria-label={`${side}の数を増やす`} disabled={count === null || count === 10}
          onClick={() => { if (count !== null) onChange(String(count + 1)) }}>＋</button>
      </div>
      {count === null && <p className="input-error" id={`${id}-error`}>0〜10の整数で入力してください</p>}
    </div>
  )
}

function App() {
  const [battle, setBattle] = useState(createInitialBattle)
  const [allyCount, setAllyCount] = useState('0')
  const [enemyCount, setEnemyCount] = useState('0')
  const prepared = prepareBattle(allyCount, enemyCount)
  const unplaced = battle.characters.filter((character) => character.position === null)
  const reset = () => {
    const message = battle.phase === 'active'
      ? '次の戦闘の準備を始めます。全駒と設定を消して、最初から準備しますか？'
      : '今の戦闘の準備をやり直します。全駒と設定を消して、数の指定からやり直しますか？'
    if (!window.confirm(message)) return
    setBattle(createInitialBattle())
    setAllyCount('0')
    setEnemyCount('0')
  }

  return (
    <main>
      <h1>Overstrata 戦闘ボード</h1>
      <p className="board-help">駒を選んで空きマスを押すと配置・移動。同じ駒で選択解除。薄い色は移動範囲の目安です。</p>
      <Board size={boardSize} state={battle}
        onTap={(position) => setBattle((current) => ({ ...current, ...tapPosition(current, position, boardSize) }))} />
      <p className="legend"><span className="ally-label">● 味方</span> <span className="enemy-label">● 敵</span> 移動力は全駒5マス</p>
      {battle.phase === 'counts' ? (
        <section aria-label="駒の数の指定" className="preparation-panel">
          <h2>駒の準備</h2>
          <p id="count-help">それぞれ0〜10体の整数を入力してください。</p>
          <form onSubmit={(event) => { event.preventDefault(); if (prepared) setBattle(prepared) }}>
            <div className="count-fields">
              <CountInput side="味方" value={allyCount} onChange={setAllyCount} />
              <CountInput side="敵" value={enemyCount} onChange={setEnemyCount} />
            </div>
            {parseCount(allyCount) === 0 && parseCount(enemyCount) === 0 && <p>味方か敵を1体以上にしてください</p>}
            <button className="primary" type="submit" disabled={prepared === null}>駒を用意する</button>
          </form>
        </section>
      ) : (
        <section aria-label={battle.phase === 'preparing' ? '配置の準備' : '戦闘中'} className="preparation-panel">
          <h2>{battle.phase === 'preparing' ? '駒を配置' : '準備完了'}</h2>
          {battle.phase === 'preparing' ? (
            <>
              <p>一覧から駒を選び、盤面の空きマスに置いてください。確定するまで位置を修正できます。</p>
              <div role="group" aria-label="未配置の駒">
                <h3>未配置：{unplaced.length}体</h3>
                {unplaced.length === 0 ? <p>全駒を配置しました。「確定」で準備を完了します。</p> : (
                  <div className="unplaced-tokens">
                    {unplaced.map((character) => (
                      <button key={character.id} type="button" className={`unplaced-token unplaced-token-${character.side}`}
                        aria-label={`未配置 ${character.name}（${character.side === 'ally' ? '味方' : '敵'}・移動力${character.movement}）`}
                        aria-pressed={battle.selection.kind === 'character' && battle.selection.id === character.id}
                        onClick={() => setBattle((current) => ({ ...current, ...tapCharacter(current, character.id) }))}>
                        {character.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button className="primary" type="button" disabled={!canConfirmBattle(battle)} onClick={() => setBattle(confirmBattle)}>確定</button>
              <p className="reset-help">数を変えるときは、全駒と設定を消して準備をやり直します。</p>
            </>
          ) : <p>駒を選んで動かせます。移動範囲の外にも自由に動かせます。</p>}
          <button className="reset" type="button" onClick={reset}>{battle.phase === 'preparing' ? '準備をやり直す' : '新しい戦闘を始める'}</button>
        </section>
      )}
    </main>
  )
}

export default App
