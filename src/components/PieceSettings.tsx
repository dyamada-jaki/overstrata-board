import { useLayoutEffect, useRef } from 'react'
import type { Character } from '../domain/character.ts'
import { stepMovement } from '../domain/preparation.ts'
import { tokenClass } from './piece.ts'
import { placePopup, popupMargin } from './popupPosition.ts'

/**
 * 駒の設定ポップアップ（spec.md 2.2 #45）。移動力・状態・削除をまとめる。
 * modal の dialog で top layer に出すので、盤面・未配置一覧を押し下げず、外側への入力は背後へ届かない。
 */
export function PieceSettings({ character, editable, anchor, returnFocus, initialFocus, onMovement, onToggleDowned, onDelete, onClose }: {
  character: Character
  /** 移動力を変更できるか（確定前の駒）。確定済みの駒は値を表示だけする。 */
  editable: boolean
  /** 近くに表示する基準の要素。 */
  anchor: HTMLElement | null
  /** ×・Esc・外側で閉じたときにフォーカスを戻す要素。削除の実行では戻さない。 */
  returnFocus: HTMLElement | null
  initialFocus: 'close' | 'delete'
  onMovement: (movement: number) => void
  onToggleDowned: () => void
  onDelete: () => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const deleteRef = useRef<HTMLButtonElement>(null)
  const restoreFocus = useRef(false)
  const pressedOutside = useRef(false)
  useLayoutEffect(() => {
    const dialog = ref.current!
    // showModal は中の最初のボタンへフォーカスし、見えなければスクロールする。先に今見えている範囲へ置き、ページを動かさない。
    dialog.style.top = `${window.scrollY + popupMargin}px`
    dialog.style.left = `${window.scrollX + popupMargin}px`
    dialog.showModal()
    const place = () => {
      if (!anchor) return
      const { width, height } = dialog.getBoundingClientRect()
      const { top, left } = placePopup(anchor.getBoundingClientRect(), { width, height },
        { width: document.documentElement.clientWidth, height: window.innerHeight })
      // 文書の座標で置き、ページのスクロールでは盤面と一緒に動かす。
      dialog.style.top = `${top + window.scrollY}px`
      dialog.style.left = `${left + window.scrollX}px`
    }
    place()
    ;(initialFocus === 'delete' ? deleteRef : closeRef).current!.focus({ preventScroll: true })
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('resize', place)
      dialog.close()
      if (restoreFocus.current && returnFocus?.isConnected) returnFocus.focus()
    }
  }, [anchor, returnFocus, initialFocus])
  const close = () => {
    restoreFocus.current = true
    onClose()
  }
  const name = character.name
  const decrement = stepMovement(character.movement, -1)
  const increment = stepMovement(character.movement, 1)

  return (
    <dialog ref={ref} className="piece-settings" aria-labelledby="piece-settings-title"
      onCancel={(event) => { event.preventDefault(); close() }}
      // 外側（backdrop）で押し始めて離したときだけ閉じる。長押しで開いた操作の続きの click では閉じない。
      onPointerDown={(event) => { pressedOutside.current = event.target === event.currentTarget }}
      // 長押しで開いた後に指を離すと、backdrop へ届く mousedown がフォーカスを dialog 自体へ移すので止める。
      onMouseDown={(event) => { if (event.target === event.currentTarget) event.preventDefault() }}
      onClick={(event) => {
        const outside = pressedOutside.current && event.target === event.currentTarget
        pressedOutside.current = false
        if (outside) close()
      }}
      // Android は長押しで contextmenu を出す。タイマーで開いた後に backdrop へ届くので、閉じずに既定のメニューだけ止める。
      onContextMenu={(event) => { if (event.target === event.currentTarget) event.preventDefault() }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
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
      <div className="piece-settings-body">
        <div className="piece-settings-header">
          <h2 id="piece-settings-title">
            <span className={tokenClass(character)} aria-hidden="true">{character.number}</span>
            {name}の設定
          </h2>
          <button ref={closeRef} type="button" className="piece-settings-close" aria-label="閉じる" onClick={close}>×</button>
        </div>
        {editable ? (
          <div role="group" aria-label={`${name}の移動力`} className="piece-settings-row">
            <span>移動力</span>
            <div className="count-controls">
              <button type="button" aria-label={`${name}の移動力を減らす`} disabled={decrement === null}
                onClick={() => { if (decrement !== null) onMovement(decrement) }}>−</button>
              <output className="movement-value">{character.movement}</output>
              <button type="button" aria-label={`${name}の移動力を増やす`} disabled={increment === null}
                onClick={() => { if (increment !== null) onMovement(increment) }}>＋</button>
              <span>マス</span>
            </div>
          </div>
        ) : <p className="piece-settings-row">移動力：{character.movement}マス</p>}
        <p className="piece-status">状態：{character.downed ? '倒れている' : '通常'}</p>
        <div className="piece-settings-actions">
          {/* 文言だけを変える同じボタンなので、切り替え後もフォーカスが残る。 */}
          <button className="downed-toggle" type="button" onClick={onToggleDowned}>
            {character.downed ? '通常に戻す' : '倒れた状態にする'}
          </button>
          {/* 確認の取消後は、開き直したポップアップが initialFocus で「この駒を削除」へフォーカスを戻す。 */}
          <button ref={deleteRef} className="reset" type="button" onClick={onDelete}>この駒を削除</button>
        </div>
      </div>
    </dialog>
  )
}
