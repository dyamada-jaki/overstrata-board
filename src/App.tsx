import { useEffect, useRef, useState } from 'react'
import { MovementControl } from './components/MovementControl.tsx'
import { preparationMovement } from './data/movement.ts'
import { Board } from './components/Board.tsx'
import { boardSize } from './data/board.ts'
import { changeMovement, areBothCountsZero, stepTokenCount, canConfirmBattle, confirmBattle, createInitialBattle, parseCount, prepareBattle } from './domain/preparation.ts'
import { tapCharacter, tapPosition } from './domain/selection.ts'
import './App.css'

function CountInput({ side, value, onChange, autoFocus = false }: { side: '味方' | '敵'; value: string; onChange: (value: string) => void; autoFocus?: boolean }) {
  const count = parseCount(value)
  const decrement = stepTokenCount(value, -1)
  const increment = stepTokenCount(value, 1)
  const id = side === '味方' ? 'ally-count' : 'enemy-count'
  return (
    <div className="count-field">
      <label htmlFor={id}>{side}の数</label>
      <div className="count-controls">
        <button type="button" aria-label={`${side}の数を減らす`} disabled={decrement === null}
          onClick={() => { if (decrement !== null) onChange(String(decrement)) }}>−</button>
        <input id={id} type="text" inputMode="numeric" value={value} autoFocus={autoFocus}
          aria-invalid={count === null} aria-describedby={count === null ? `${id}-error` : 'count-help'}
          onChange={(event) => onChange(event.target.value)} />
        <button type="button" aria-label={`${side}の数を増やす`} disabled={increment === null}
          onClick={() => { if (increment !== null) onChange(String(increment)) }}>＋</button>
      </div>
      {count === null && <p className="input-error" id={`${id}-error`}>0〜10の整数で入力してください</p>}
    </div>
  )
}

function App() {
  const [battle, setBattle] = useState(createInitialBattle)
  const [allyCount, setAllyCount] = useState('0')
  const [enemyCount, setEnemyCount] = useState('0')
  const [movementEditorOpen, setMovementEditorOpen] = useState(true)
  const [resetOpen, setResetOpen] = useState(false)
  const [focusCounts, setFocusCounts] = useState(false)
  const prepared = prepareBattle(allyCount, enemyCount)
  const unplaced = battle.characters.filter((character) => character.position === null)
  const selectedId = battle.selection.kind === 'character' ? battle.selection.id : null
  const selected = battle.characters.find((character) => character.id === selectedId)
  const movementControl = battle.phase === 'preparing' && movementEditorOpen && selected ? (
    <MovementControl character={selected}
      onStep={(delta) => setBattle((current) => changeMovement(current, selected.id, delta))}
      onClose={() => setMovementEditorOpen(false)} />
  ) : null
  const reset = () => {
    setBattle(createInitialBattle())
    setAllyCount('0')
    setEnemyCount('0')
    setResetOpen(false)
    setMovementEditorOpen(true)
    setFocusCounts(true)
  }

  return (
    <main>
      <h1>Overstrata 戦闘ボード</h1>
      <p className="board-help">駒を選んで空きマスを押すと配置・移動。同じ駒で選択解除。薄い色は移動範囲の目安です。</p>
      <div className="battle-layout">
        <div>
          <Board size={boardSize} state={battle} movementControl={movementControl}
            onTap={(position) => {
              setMovementEditorOpen(true)
              setBattle((current) => ({ ...current, ...tapPosition(current, position, boardSize) }))
            }} />
          <p className="legend"><span className="ally-label">● 味方</span> <span className="enemy-label">● 敵</span> 移動力の初期値は{preparationMovement.initial}マス（準備中に{preparationMovement.min}〜{preparationMovement.max}マスで設定）</p>
        </div>
        {battle.phase === 'counts' ? (
          <section aria-label="駒の数の指定" className="preparation-panel">
            <h2>駒の準備</h2>
            <p id="count-help">それぞれ0〜10体の整数を入力してください。</p>
            <form onSubmit={(event) => { event.preventDefault(); if (prepared) setBattle(prepared) }}>
              <div className="count-fields">
                <CountInput side="味方" value={allyCount} onChange={setAllyCount} autoFocus={focusCounts} />
                <CountInput side="敵" value={enemyCount} onChange={setEnemyCount} />
              </div>
              {areBothCountsZero(allyCount, enemyCount) && <p>味方か敵を1体以上にしてください</p>}
              <button className="primary" type="submit" disabled={prepared === null}>駒を用意する</button>
            </form>
          </section>
        ) : (
          <section aria-label={battle.phase === 'preparing' ? '配置の準備' : '戦闘中'} className="preparation-panel">
            <h2>{battle.phase === 'preparing' ? '駒を配置' : '準備完了'}</h2>
            {battle.phase === 'preparing' ? (
              <>
                <p>一覧から駒を選び、盤面の空きマスに置いてください。確定するまで位置と移動力を修正できます。駒を選ぶと移動力の設定が開きます。×で設定だけを閉じて、隠れているマスへも動かせます。</p>
                <div role="group" aria-label="未配置の駒">
                  <h3>未配置：{unplaced.length}体</h3>
                  {unplaced.length === 0 ? <p>全駒を配置しました。「確定」で準備を完了します。</p> : (
                    <div className="unplaced-tokens">
                      {(['ally', 'enemy'] as const).map((side) => (
                        <div className="unplaced-side" key={side}>
                          {unplaced.filter((character) => character.side === side).map((character) => (
                            <div key={character.id} className="unplaced-item">
                              <button type="button" className="unplaced-token"
                                aria-label={`未配置 ${character.name}（${character.side === 'ally' ? '味方' : '敵'}・移動力${character.movement}）`}
                                aria-pressed={battle.selection.kind === 'character' && battle.selection.id === character.id}
                                onClick={() => {
                                  setMovementEditorOpen(true)
                                  setBattle((current) => ({ ...current, ...tapCharacter(current, character.id) }))
                                }}>
                                <span className={`board-token board-token-${character.side}`} aria-hidden="true">{character.number}</span>
                                <span>{character.name}</span>
                              </button>
                              {selectedId === character.id && movementControl}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button className="primary" type="button" disabled={!canConfirmBattle(battle)} onClick={() => setBattle(confirmBattle)}>確定</button>
                <p className="reset-help">数を変えるときは、全駒と設定を消して準備をやり直します。</p>
              </>
            ) : <p>駒を選んで動かせます。移動範囲の外にも自由に動かせます。</p>}
            <button className="reset" type="button" onClick={(event) => { event.currentTarget.focus(); setResetOpen(true) }}>{battle.phase === 'preparing' ? '準備をやり直す' : '新しい戦闘を始める'}</button>
          </section>
        )}
      </div>
      {resetOpen && battle.phase !== 'counts' && <ResetDialog phase={battle.phase} onConfirm={reset} onCancel={() => setResetOpen(false)} />}
    </main>
  )
}

const resetTexts = {
  preparing: {
    title: '準備をやり直す',
    body: '今の戦闘の準備を最初からやり直します。未配置・配置済みの全駒と、味方・敵の数の設定を消して、最初の準備画面へ戻ります。',
    action: 'やり直す',
  },
  active: {
    title: '新しい戦闘を始める',
    body: '次の戦闘の準備をゼロから始めます。今の盤面の全駒と、味方・敵の数の設定を消して、最初の準備画面へ戻ります。',
    action: '始める',
  },
}

function ResetDialog({ phase, onConfirm, onCancel }: {
  phase: 'preparing' | 'active'; onConfirm: () => void; onCancel: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const text = resetTexts[phase]
  useEffect(() => {
    const dialog = ref.current!
    const opener = document.activeElement
    // top layer に置き、背後を inert にする。open 属性だけでは入力を遮断できない。
    dialog.showModal()
    cancelRef.current!.focus()
    return () => {
      dialog.close()
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [])
  return (
    <dialog ref={ref} className="reset-dialog" aria-labelledby="reset-title" aria-describedby="reset-body"
      onCancel={(event) => { event.preventDefault(); onCancel() }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const buttons = event.currentTarget.querySelectorAll('button')
        const first = buttons[0]!
        const last = buttons[buttons.length - 1]!
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }}>
      <h2 id="reset-title">{text.title}</h2>
      <p id="reset-body">{text.body}</p>
      <div className="dialog-actions">
        <button ref={cancelRef} type="button" onClick={onCancel}>キャンセル</button>
        <button type="button" className="reset" onClick={onConfirm}>{text.action}</button>
      </div>
    </dialog>
  )
}

export default App
