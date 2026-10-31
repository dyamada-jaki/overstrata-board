import { useLayoutEffect, useRef, type ReactNode } from 'react'
import type { Character } from '../domain/character.ts'
import { getPopupPosition, type PopupAnchor } from './popupPosition.ts'

export interface SettingsTarget { id: string; anchor: PopupAnchor; opener: HTMLButtonElement }

export function PieceSettings({ character, target, children, onClose, deleting = false }: {
  character: Character; target: SettingsTarget; children: ReactNode; onClose: () => void; deleting?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const outsidePress = useRef(false)
  const restore = useRef(true)
  // 削除実行でこの部品も消える場合だけ、元の操作への復帰を抑える。
  useLayoutEffect(() => { restore.current = !deleting }, [deleting])
  useLayoutEffect(() => {
    const dialog = ref.current!
    dialog.showModal()
    const position = () => {
      const rect = dialog.getBoundingClientRect()
      const point = getPopupPosition(target.anchor, rect, { width: window.innerWidth, height: window.innerHeight })
      dialog.style.left = `${point.left}px`
      dialog.style.top = `${point.top}px`
    }
    position()
    dialog.querySelector<HTMLButtonElement>('button')!.focus({ preventScroll: true })
    window.addEventListener('resize', position)
    return () => {
      window.removeEventListener('resize', position)
      dialog.close()
      if (restore.current && target.opener.isConnected) target.opener.focus({ preventScroll: true })
      else if (!restore.current && document.activeElement instanceof HTMLElement) document.activeElement.blur()
    }
  }, [target])
  const outside = (x: number, y: number) => {
    const rect = ref.current!.getBoundingClientRect()
    return x < rect.left || x > rect.right || y < rect.top || y > rect.bottom
  }
  return <dialog ref={ref} className="piece-settings selected-piece" aria-labelledby="piece-settings-title"
    onCancel={(event) => { event.preventDefault(); onClose() }}
    onPointerDown={(event) => { outsidePress.current = outside(event.clientX, event.clientY) }}
    onPointerUp={(event) => { outsidePress.current = outsidePress.current && outside(event.clientX, event.clientY) }}
    onClick={(event) => {
      if (!outside(event.clientX, event.clientY)) return
      event.preventDefault()
      event.stopPropagation()
      if (outsidePress.current) onClose()
      outsidePress.current = false
    }}
    onKeyDown={(event) => {
      if (event.key !== 'Tab') return
      const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
      const first = buttons[0]!
      const last = buttons[buttons.length - 1]!
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }}>
    <div className="settings-heading">
      <div><h2 id="piece-settings-title">{character.name}の設定</h2>
        <p className="settings-identity">{character.side === 'ally' ? '味方' : '敵'}・番号{character.number}</p></div>
      <button type="button" aria-label="設定を閉じる" onClick={onClose}>×</button>
    </div>
    {children}
  </dialog>
}
