import { useId, useState } from 'react'
import { boardSize } from '../data/board.ts'
import {
  canConfirm,
  canPrepareTokens,
  confirmPlacement,
  createBattle,
  parseTokenCount,
  prepareTokens,
  stepTokenCount,
  tapToken,
  type BattleState,
} from '../domain/battle.ts'
import type { Character } from '../domain/character.ts'
import { tapPosition } from '../domain/selection.ts'
import { Board } from './Board.tsx'
import './BattleScreen.css'

type ResetKind = 'retry' | 'next'

// 全駒と設定を消す前の確認（spec.md 2.2）。準備中と確定後で目的に合わせて呼び分ける。
const resetTexts: Record<ResetKind, { title: string; purpose: string; action: string }> = {
  retry: { title: '準備をやり直す', purpose: '今の戦闘の準備を最初からやり直します。', action: 'やり直す' },
  next: { title: '新しい戦闘を始める', purpose: '次の戦闘の準備をゼロから始めます。', action: '始める' },
}

const initialCount = '0'

/** 駒の準備から確定後の移動までを1台で行う画面。準備の状態と数の入力をここで持つ。 */
export function BattleScreen() {
  const [battle, setBattle] = useState<BattleState>(createBattle)
  const [allyInput, setAllyInput] = useState(initialCount)
  const [enemyInput, setEnemyInput] = useState(initialCount)
  const [reset, setReset] = useState<ResetKind | null>(null)

  const counting = battle.stage === 'counts'
  const allyCount = parseTokenCount(allyInput)
  const enemyCount = parseTokenCount(enemyInput)
  const unplaced = battle.characters.filter((character) => character.position === null)

  function prepare() {
    if (allyCount === null || enemyCount === null) return
    setBattle((current) => prepareTokens(current, allyCount, enemyCount))
  }

  function clearAll() {
    setBattle(createBattle())
    setAllyInput(initialCount)
    setEnemyInput(initialCount)
    setReset(null)
  }

  return (
    <>
      <section className="battle-counts" aria-label="駒の数">
        <CountField label="味方の数" value={allyInput} onChange={setAllyInput} disabled={!counting} />
        <CountField label="敵の数" value={enemyInput} onChange={setEnemyInput} disabled={!counting} />
        {counting ? (
          <div className="battle-prepare">
            <button
              type="button"
              className="battle-button battle-button-primary"
              disabled={!canPrepareTokens(allyCount, enemyCount)}
              onClick={prepare}
            >
              駒を用意する
            </button>
            {allyCount === 0 && enemyCount === 0 && (
              <p className="battle-note">味方か敵を1体以上にしてください</p>
            )}
          </div>
        ) : (
          <p className="battle-note">数を変えるときは「準備をやり直す」を押してください</p>
        )}
      </section>

      <Board
        size={boardSize}
        state={battle}
        onTapPosition={(position) => setBattle((current) => tapPosition(current, position, boardSize))}
      />

      {battle.stage === 'placing' && (
        <UnplacedTokens
          tokens={unplaced}
          selectedId={battle.selection.kind === 'character' ? battle.selection.id : null}
          onTap={(id) => setBattle((current) => tapToken(current, id))}
        />
      )}

      {battle.stage === 'placing' && (
        <div className="battle-actions">
          <button
            type="button"
            className="battle-button battle-button-primary"
            disabled={!canConfirm(battle)}
            onClick={() => setBattle(confirmPlacement)}
          >
            確定
          </button>
          {unplaced.length > 0 && (
            <p className="battle-note">未配置の駒が残っています（残り{unplaced.length}体）</p>
          )}
          <button type="button" className="battle-button" onClick={() => setReset('retry')}>
            準備をやり直す
          </button>
        </div>
      )}

      {battle.stage === 'confirmed' && (
        <div className="battle-actions">
          <p className="battle-note">準備が完了しました。駒を選んで動かせます。</p>
          <button type="button" className="battle-button" onClick={() => setReset('next')}>
            新しい戦闘を始める
          </button>
        </div>
      )}

      {reset && <ResetDialog kind={reset} onConfirm={clearAll} onCancel={() => setReset(null)} />}
    </>
  )
}

function CountField({ label, value, onChange, disabled }: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled: boolean
}) {
  const id = useId()
  const invalid = parseTokenCount(value) === null
  const decrement = stepTokenCount(value, -1)
  const increment = stepTokenCount(value, 1)

  return (
    <div className="battle-count">
      <label htmlFor={id}>{label}</label>
      <div className="battle-count-controls">
        <button
          type="button"
          className="battle-step"
          aria-label={`${label}を減らす`}
          disabled={disabled || decrement === null}
          onClick={() => decrement !== null && onChange(String(decrement))}
        >
          −
        </button>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={value}
          disabled={disabled}
          aria-invalid={invalid}
          aria-describedby={invalid ? `${id}-error` : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className="battle-step"
          aria-label={`${label}を増やす`}
          disabled={disabled || increment === null}
          onClick={() => increment !== null && onChange(String(increment))}
        >
          ＋
        </button>
      </div>
      {invalid && <p id={`${id}-error`} className="battle-error">0〜10の整数で入力してください</p>}
    </div>
  )
}

function UnplacedTokens({ tokens, selectedId, onTap }: {
  tokens: readonly Character[]
  selectedId: string | null
  onTap: (id: string) => void
}) {
  return (
    <section className="battle-unplaced" aria-label="未配置の駒">
      <h2>未配置の駒</h2>
      {tokens.length === 0 ? (
        <p className="battle-note">すべて配置しました。「確定」を押すと準備が完了します。</p>
      ) : (
        <ul>
          {tokens.map((token) => (
            <li key={token.id}>
              <button
                type="button"
                className="battle-token-button"
                aria-label={token.name}
                aria-pressed={selectedId === token.id}
                onClick={() => onTap(token.id)}
              >
                <span className={`board-token board-token-${token.side}`}>{token.number}</span>
                <span>{token.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ResetDialog({ kind, onConfirm, onCancel }: {
  kind: ResetKind
  onConfirm: () => void
  onCancel: () => void
}) {
  const id = useId()
  const text = resetTexts[kind]

  // 背景で画面全体を覆い、確認中は盤面などを押せないようにする。
  return (
    <div className="battle-dialog-backdrop">
      <div
        className="battle-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-body`}
      >
        <h2 id={`${id}-title`}>{text.title}</h2>
        <p id={`${id}-body`}>
          {text.purpose}
          未配置・配置済みの全駒と、味方・敵の数の設定を消して、最初の準備画面へ戻ります。
        </p>
        <div className="battle-dialog-actions">
          <button type="button" className="battle-button" autoFocus onClick={onCancel}>キャンセル</button>
          <button type="button" className="battle-button battle-button-danger" onClick={onConfirm}>
            {text.action}
          </button>
        </div>
      </div>
    </div>
  )
}
