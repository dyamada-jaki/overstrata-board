import { useEffect, useRef, useState } from 'react'
import { Board } from './components/Board.tsx'
import { boardSize } from './data/board.ts'
import { movementSetting } from './data/movement.ts'
import { tokenLimits } from './data/tokens.ts'
import type { Character, Side } from './domain/character.ts'
import {
  areBothCountsZero, stepTokenCount, canConfirmAdditions, canConfirmBattle, canEditMovement, confirmAdditions, confirmBattle,
  createInitialBattle, deleteCharacter, getAddableCount, parseCount, prepareAdditions, prepareBattle, setMovement, stepMovement,
  type BattleState,
} from './domain/preparation.ts'
import { tapCharacter, tapPosition } from './domain/selection.ts'
import './App.css'

const sideNames: Record<Side, '味方' | '敵'> = { ally: '味方', enemy: '敵' }

/** 最初の準備と途中の追加で共通の数の入力。上限と案内は呼び出し側から渡す（#33）。 */
function CountInput({ id, label, value, max, helpId, help, onChange, autoFocus = false }: {
  id: string; label: string; value: string; max: number; helpId: string; help?: string
  onChange: (value: string) => void; autoFocus?: boolean
}) {
  const count = parseCount(value, max)
  const decrement = stepTokenCount(value, -1, max)
  const increment = stepTokenCount(value, 1, max)
  return (
    <div className="count-field">
      <label htmlFor={id}>{label}</label>
      <div className="count-controls">
        <button type="button" aria-label={`${label}を減らす`} disabled={decrement === null}
          onClick={() => { if (decrement !== null) onChange(String(decrement)) }}>−</button>
        <input id={id} type="text" inputMode="numeric" value={value} autoFocus={autoFocus}
          aria-invalid={count === null} aria-describedby={count === null ? `${id}-error` : helpId}
          onChange={(event) => onChange(event.target.value)} />
        <button type="button" aria-label={`${label}を増やす`} disabled={increment === null}
          onClick={() => { if (increment !== null) onChange(String(increment)) }}>＋</button>
      </div>
      {help !== undefined && <p className="count-help" id={helpId}>{help}</p>}
      {count === null && <p className="input-error" id={`${id}-error`}>0〜{max}の整数で入力してください</p>}
    </div>
  )
}

/** 「駒を増やす」で開く追加数のエリア。追加可能数は domain の同じ計算結果を表示と判定に使う（#33）。 */
function AdditionArea({ battle, onAdd, onCancel }: {
  battle: BattleState; onAdd: (next: BattleState) => void; onCancel: () => void
}) {
  const [counts, setCounts] = useState<Record<Side, string>>({ ally: '0', enemy: '0' })
  const added = prepareAdditions(battle, counts.ally, counts.enemy)
  return (
    <div role="group" aria-label="追加する駒の数" className="addition-area">
      <h3>駒を増やす</h3>
      <div className="count-fields">
        {(['ally', 'enemy'] as const).map((side) => {
          const addable = getAddableCount(battle, side)
          return (
            <CountInput key={side} id={`${side}-addition`} label={`${sideNames[side]}の追加数`} value={counts[side]} max={addable}
              helpId={`${side}-addition-help`} help={`あと${addable}体追加できます`}
              onChange={(value) => setCounts((current) => ({ ...current, [side]: value }))} />
          )
        })}
      </div>
      {areBothCountsZero(counts.ally, counts.enemy) && <p>味方か敵を1体以上にしてください</p>}
      <div className="addition-actions">
        <button type="button" onClick={onCancel}>キャンセル</button>
        <button className="primary" type="button" disabled={added === null} onClick={() => { if (added) onAdd(added) }}>追加する</button>
      </div>
    </div>
  )
}

function UnplacedList({ battle, onTap }: { battle: BattleState; onTap: (id: string) => void }) {
  const unplaced = battle.characters.filter((character) => character.position === null)
  return (
    <div role="group" aria-label="未配置の駒">
      <h3>未配置：{unplaced.length}体</h3>
      {unplaced.length === 0 ? (
        <p>{battle.characters.length === 0 ? '駒がありません。「駒を増やす」で追加できます。' : '全駒を配置しました。「確定」で準備を完了します。'}</p>
      ) : (
        <div className="unplaced-tokens">
          {(['ally', 'enemy'] as const).map((side) => (
            <div className="unplaced-side" key={side}>
              {unplaced.filter((character) => character.side === side).map((character) => (
                <button key={character.id} type="button" className="unplaced-token"
                  aria-label={`未配置 ${character.name}（${sideNames[character.side]}・移動力${character.movement}）`}
                  aria-pressed={battle.selection.kind === 'character' && battle.selection.id === character.id}
                  onClick={() => onTap(character.id)}>
                  <span className={`board-token board-token-${character.side}`} aria-hidden="true">{character.number}</span>
                  <span>{character.name}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
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
        <span className={`board-token board-token-${character.side}`} aria-hidden="true">{character.number}</span>
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

type Dialog = { kind: 'reset' } | { kind: 'delete'; character: Character }

function App() {
  const [battle, setBattle] = useState(createInitialBattle)
  const [allyCount, setAllyCount] = useState('0')
  const [enemyCount, setEnemyCount] = useState('0')
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [additionOpen, setAdditionOpen] = useState(false)
  const [focusCounts, setFocusCounts] = useState(false)
  const prepared = prepareBattle(allyCount, enemyCount)
  const hasUnplaced = battle.characters.some((character) => character.position === null)
  const hasPending = battle.phase === 'active' && battle.characters.some((character) => !character.confirmed)
  const { selection } = battle
  const selected = selection.kind === 'character'
    ? battle.characters.find((character) => character.id === selection.id) : undefined
  const tapToken = (id: string) => setBattle((current) => ({ ...current, ...tapCharacter(current, id) }))
  const reset = () => {
    setBattle(createInitialBattle())
    setAllyCount('0')
    setEnemyCount('0')
    setDialog(null)
    setAdditionOpen(false)
    setFocusCounts(true)
  }
  const remove = (id: string) => {
    setBattle((current) => deleteCharacter(current, id))
    setDialog(null)
  }

  return (
    <main>
      <h1>Overstrata 戦闘ボード</h1>
      <p className="board-help">駒を選んで空きマスを押すと配置・移動。同じ駒で選択解除。薄い色は移動範囲の目安です。</p>
      <div className="battle-layout">
        <div>
          <Board size={boardSize} state={battle}
            onTap={(position) => setBattle((current) => ({ ...current, ...tapPosition(current, position, boardSize) }))} />
          <p className="legend"><span className="ally-label">● 味方</span> <span className="enemy-label">● 敵</span> 移動力の初期値は{movementSetting.initial}マス（準備中と、追加した駒の「追加分を確定」までは、駒を選ぶと変更できます）</p>
        </div>
        {battle.phase === 'counts' ? (
          <section aria-label="駒の数の指定" className="preparation-panel">
            <h2>駒の準備</h2>
            <p id="count-help">それぞれ0〜{tokenLimits.perSide}体の整数を入力してください。</p>
            <form onSubmit={(event) => { event.preventDefault(); if (prepared) setBattle(prepared) }}>
              <div className="count-fields">
                <CountInput id="ally-count" label="味方の数" value={allyCount} max={tokenLimits.perSide} helpId="count-help"
                  onChange={setAllyCount} autoFocus={focusCounts} />
                <CountInput id="enemy-count" label="敵の数" value={enemyCount} max={tokenLimits.perSide} helpId="count-help"
                  onChange={setEnemyCount} />
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
            {hasPending && <p>追加した駒を盤面に置き、「追加分を確定」で確定します。確定までは選んだ追加分の移動力を −・＋ で変更できます。</p>}
            {selected && (
              <div className="selected-piece">
                {canEditMovement(battle, selected.id) ? (
                  <MovementSetting character={selected}
                    onChange={(movement) => setBattle((current) => setMovement(current, selected.id, movement))} />
                ) : (
                  <p className="movement-setting-title">
                    <span className={`board-token board-token-${selected.side}`} aria-hidden="true">{selected.number}</span>
                    <span>{selected.name}を選択中</span>
                  </p>
                )}
                <button className="reset" type="button"
                  onClick={(event) => { event.currentTarget.focus(); setDialog({ kind: 'delete', character: selected }) }}>この駒を削除</button>
              </div>
            )}
            {(battle.phase === 'preparing' || hasUnplaced) && <UnplacedList battle={battle} onTap={tapToken} />}
            {additionOpen ? (
              <AdditionArea battle={battle} onCancel={() => setAdditionOpen(false)}
                onAdd={(next) => { setBattle(next); setAdditionOpen(false) }} />
            ) : <button className="add-tokens" type="button" onClick={() => setAdditionOpen(true)}>駒を増やす</button>}
            {battle.phase === 'preparing' && (
              <button className="primary" type="button" disabled={!canConfirmBattle(battle)} onClick={() => setBattle(confirmBattle)}>確定</button>
            )}
            {hasPending && (
              <button className="primary confirm-additions" type="button" disabled={!canConfirmAdditions(battle)} onClick={() => setBattle(confirmAdditions)}>追加分を確定</button>
            )}
            {battle.phase === 'preparing' && <p className="reset-help">全駒と設定を消して最初からやり直すこともできます。</p>}
            <button className="reset" type="button" onClick={(event) => { event.currentTarget.focus(); setDialog({ kind: 'reset' }) }}>{battle.phase === 'preparing' ? '準備をやり直す' : '新しい戦闘を始める'}</button>
          </section>
        )}
      </div>
      {dialog?.kind === 'reset' && battle.phase !== 'counts' && (
        <ConfirmDialog {...resetTexts[battle.phase]} onConfirm={reset} onCancel={() => setDialog(null)} />
      )}
      {dialog?.kind === 'delete' && (
        <ConfirmDialog title={`${dialog.character.name}を削除しますか？`} body={`${dialog.character.name}を盤面と一覧から取り除きます。`}
          action="削除する" onConfirm={() => remove(dialog.character.id)} onCancel={() => setDialog(null)} />
      )}
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

/** アプリ内の確認画面。全体のやり直しと駒の削除で使う。 */
function ConfirmDialog({ title, body, action, onConfirm, onCancel }: {
  title: string; body: string; action: string; onConfirm: () => void; onCancel: () => void
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
      <h2 id="reset-title">{title}</h2>
      <p id="reset-body">{body}</p>
      <div className="dialog-actions">
        <button ref={cancelRef} type="button" onClick={onCancel}>キャンセル</button>
        <button type="button" className="reset" onClick={onConfirm}>{action}</button>
      </div>
    </dialog>
  )
}

export default App
