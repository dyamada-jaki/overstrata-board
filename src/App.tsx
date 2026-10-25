import { useEffect, useRef, useState } from 'react'
import { Board } from './components/Board.tsx'
import { pieceDetails, tokenClass } from './components/piece.ts'
import { pieceLimits } from './data/pieces.ts'
import { boardSize } from './data/board.ts'
import { movementSetting } from './data/movement.ts'
import type { Character } from './domain/character.ts'
import { addPieces, canConfirmAdditions, canEditMovement, confirmAdditions, getAdditionCapacity, removePiece, toggleDowned, areBothCountsZero, stepTokenCount, canConfirmBattle, confirmBattle, createInitialBattle, parseCount, prepareBattle, setMovement, stepMovement } from './domain/preparation.ts'
import { tapCharacter, tapPosition } from './domain/selection.ts'
import './App.css'

function CountInput({ side, value, onChange, autoFocus = false, maximum = pieceLimits.perSide, adding = false }: { side: '味方' | '敵'; value: string; onChange: (value: string) => void; autoFocus?: boolean; maximum?: number; adding?: boolean }) {
  const count = parseCount(value, maximum)
  const decrement = stepTokenCount(value, -1, maximum)
  const increment = stepTokenCount(value, 1, maximum)
  const id = `${side === '味方' ? 'ally' : 'enemy'}-${adding ? 'addition' : 'count'}`
  const label = `${side}の${adding ? '追加数' : '数'}`
  return (
    <div className="count-field">
      <label htmlFor={id}>{label}</label>
      <div className="count-controls">
        <button type="button" aria-label={`${label}を減らす`} disabled={decrement === null}
          onClick={() => { if (decrement !== null) onChange(String(decrement)) }}>−</button>
        <input id={id} type="text" inputMode="numeric" value={value} autoFocus={autoFocus}
          aria-invalid={count === null} aria-describedby={count === null ? `${id}-error` : adding ? `${id}-help` : 'count-help'}
          onChange={(event) => onChange(event.target.value)} />
        <button type="button" aria-label={`${label}を増やす`} disabled={increment === null}
          onClick={() => { if (increment !== null) onChange(String(increment)) }}>＋</button>
      </div>
      {adding && <p id={`${id}-help`}>0〜{maximum}体の整数を入力してください。</p>}
      {count === null && <p className="input-error" id={`${id}-error`}>0〜{maximum}の整数で入力してください</p>}
    </div>
  )
}

function MovementSetting({ character, onChange }: { character: Character; onChange: (movement: number) => void }) {
  const decrement = stepMovement(character.movement, -1)
  const increment = stepMovement(character.movement, 1)
  const name = `${character.name}の移動力`
  return (
    <div role="group" aria-label={name} className="movement-setting">
      <p className="movement-setting-title">
        <span className={tokenClass(character)} aria-hidden="true">{character.number}</span>
        <span>{name}</span>
      </p>
      <div className="count-controls">
        <button type="button" aria-label={`${name}を減らす`} disabled={decrement === null}
          onClick={() => { if (decrement !== null) onChange(decrement) }}>−</button>
        <output className="movement-value">{character.movement}</output>
        <button type="button" aria-label={`${name}を増やす`} disabled={increment === null}
          onClick={() => { if (increment !== null) onChange(increment) }}>＋</button>
        <span>マス</span>
      </div>
    </div>
  )
}

function App() {
  const [battle, setBattle] = useState(createInitialBattle)
  const [allyCount, setAllyCount] = useState('0')
  const [enemyCount, setEnemyCount] = useState('0')
  const [adding, setAdding] = useState(false)
  const [allyAddition, setAllyAddition] = useState('0')
  const [enemyAddition, setEnemyAddition] = useState('0')
  const [resetOpen, setResetOpen] = useState(false)
  const [deleting, setDeleting] = useState<Character | null>(null)
  const [focusCounts, setFocusCounts] = useState(false)
  const prepared = prepareBattle(allyCount, enemyCount)
  const addition = adding ? addPieces(battle, allyAddition, enemyAddition) : null
  const allyCapacity = getAdditionCapacity(battle, 'ally')
  const enemyCapacity = getAdditionCapacity(battle, 'enemy')
  const unplaced = battle.characters.filter((character) => character.position === null)
  const { selection } = battle
  const selected = selection.kind === 'character'
    ? battle.characters.find((character) => character.id === selection.id) : undefined
  const reset = () => {
    setBattle(createInitialBattle())
    setAllyCount('0')
    setEnemyCount('0')
    setAdding(false)
    setResetOpen(false)
    setFocusCounts(true)
  }
  const openAddition = () => {
    setAllyAddition('0')
    setEnemyAddition('0')
    setAdding(true)
  }

  return (
    <main>
      <h1>Overstrata 戦闘ボード</h1>
      <p className="board-help">駒を選んで空きマスを押すと配置・移動。同じ駒で選択解除。薄い色は移動範囲の目安です。</p>
      <div className="battle-layout">
        <div>
          <Board size={boardSize} state={battle}
            onTap={(position) => setBattle((current) => ({ ...current, ...tapPosition(current, position, boardSize) }))} />
          <p className="legend"><span className="ally-label">● 味方</span> <span className="enemy-label">● 敵</span> 移動力の初期値は{movementSetting.initial}マス（準備中・追加分の確定前に駒を選ぶと変更できます）</p>
        </div>
        {battle.phase === 'counts' ? (
          <section aria-label="駒の数の指定" className="preparation-panel">
            <h2>駒の準備</h2>
            <p id="count-help">それぞれ0〜{pieceLimits.perSide}体の整数を入力してください。</p>
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
            {battle.phase === 'preparing'
              ? <p>一覧から駒を選び、盤面の空きマスに置いてください。確定するまで位置を修正できます。選んだ駒の移動力は −・＋ で変更できます。</p>
              : <p>駒を選んで動かせます。移動範囲の外にも自由に動かせます。</p>}
            {selected && <div className="selected-piece">
              {canEditMovement(battle, selected.id)
                ? <MovementSetting character={selected} onChange={(movement) => setBattle((current) => setMovement(current, selected.id, movement))} />
                : <p className="selected-piece-name"><span className={tokenClass(selected)} aria-hidden="true">{selected.number}</span>{selected.name}</p>}
              <p className="piece-status">状態：{selected.downed ? '倒れている' : '通常'}</p>
              <div className="selected-piece-actions">
                {/* 文言だけを変える同じボタンなので、切り替え後もフォーカスが残る。 */}
                <button className="downed-toggle" type="button" onClick={() => setBattle((current) => toggleDowned(current, selected.id))}>
                  {selected.downed ? '通常に戻す' : '倒れた状態にする'}
                </button>
                <button className="reset" type="button" onClick={(event) => { event.currentTarget.focus(); setDeleting(selected) }}>この駒を削除</button>
              </div>
            </div>}
            {(battle.phase === 'preparing' || battle.pendingIds.length > 0) && <div role="group" aria-label="未配置の駒">
              <h3>未配置：{unplaced.length}体</h3>
              {unplaced.length === 0 ? <p>{battle.characters.length === 0
                ? '駒がありません。「駒を増やす」で追加できます。'
                : battle.phase === 'preparing' ? '全駒を配置しました。「確定」で準備を完了します。'
                  : '追加した駒を配置しました。「追加分を確定」で設定を完了します。'}</p> : (
                <div className="unplaced-tokens">
                  {(['ally', 'enemy'] as const).map((side) => (
                    <div className="unplaced-side" key={side}>
                      {unplaced.filter((character) => character.side === side).map((character) => (
                        <button key={character.id} type="button" className="unplaced-token"
                          aria-label={`未配置 ${character.name}（${pieceDetails(character)}）`}
                          aria-pressed={selection.kind === 'character' && selection.id === character.id}
                          onClick={() => setBattle((current) => ({ ...current, ...tapCharacter(current, character.id) }))}>
                          <span className={tokenClass(character)} aria-hidden="true">{character.number}</span>
                          <span>{character.name}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>}
            {battle.phase === 'preparing'
              ? <button className="primary" type="button" disabled={!canConfirmBattle(battle)} onClick={() => setBattle(confirmBattle)}>確定</button>
              : battle.pendingIds.length > 0 && <button className="primary" type="button" disabled={!canConfirmAdditions(battle)} onClick={() => setBattle(confirmAdditions)}>追加分を確定</button>}
            <div className="addition-panel">
              <button type="button" disabled={adding} onClick={openAddition}>駒を増やす</button>
              {adding && <form aria-label="駒の追加数" role="group" onSubmit={(event) => {
                event.preventDefault()
                if (addition) { setBattle(addition); setAdding(false) }
              }}>
                <h3>駒の追加数</h3>
                <p>味方：あと{allyCapacity}体追加できます</p>
                <p>敵：あと{enemyCapacity}体追加できます</p>
                <div className="count-fields">
                  <CountInput side="味方" adding maximum={allyCapacity} value={allyAddition} onChange={setAllyAddition} />
                  <CountInput side="敵" adding maximum={enemyCapacity} value={enemyAddition} onChange={setEnemyAddition} />
                </div>
                {areBothCountsZero(allyAddition, enemyAddition) && <p>味方か敵を1体以上にしてください</p>}
                <div className="addition-actions">
                  <button type="button" onClick={() => setAdding(false)}>キャンセル</button>
                  <button className="primary" type="submit" disabled={addition === null}>追加する</button>
                </div>
              </form>}
            </div>
            {battle.phase === 'preparing' && <p className="reset-help">全駒と設定を消して最初からやり直すこともできます。</p>}
            <button className="reset" type="button" onClick={(event) => { event.currentTarget.focus(); setResetOpen(true) }}>{battle.phase === 'preparing' ? '準備をやり直す' : '新しい戦闘を始める'}</button>
          </section>
        )}
      </div>
      {resetOpen && battle.phase !== 'counts' && <ConfirmationDialog text={resetTexts[battle.phase]} onConfirm={reset} onCancel={() => setResetOpen(false)} />}
      {deleting && <ConfirmationDialog text={{ title: '駒を削除', body: `${deleting.name}を削除しますか？`, action: '削除する' }}
        onCancel={() => setDeleting(null)} onConfirm={() => {
          setBattle((current) => removePiece(current, deleting.id))
          setDeleting(null)
        }} />}
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

function ConfirmationDialog({ text, onConfirm, onCancel }: {
  text: { title: string; body: string; action: string }; onConfirm: () => void; onCancel: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
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
