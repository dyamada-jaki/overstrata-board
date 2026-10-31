import { useEffect, useRef, type ButtonHTMLAttributes } from 'react'
import type { Character } from '../domain/character.ts'

export type OpenPieceSettings = (character: Character, trigger: HTMLButtonElement) => void

/** 通常のclickを保ち、タッチ長押し・右クリック・キーボードだけを設定操作にする。 */
export function PieceButton({ character, onOpenSettings, onClick, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {
  character?: Character; onOpenSettings?: OpenPieceSettings
}) {
  const press = useRef<{ x: number; y: number; timer: ReturnType<typeof setTimeout>; controller: AbortController } | null>(null)
  const suppressClick = useRef(false)
  const cancel = () => {
    if (!press.current) return
    clearTimeout(press.current.timer)
    press.current.controller.abort()
    press.current = null
  }
  useEffect(() => () => {
    if (press.current) {
      clearTimeout(press.current.timer)
      press.current.controller.abort()
    }
  }, [])
  return <button {...props} data-character-id={character?.id}
    onClick={(event) => {
      if (suppressClick.current) {
        suppressClick.current = false
        event.preventDefault()
        return
      }
      onClick?.(event)
    }}
    onPointerDown={(event) => {
      suppressClick.current = false
      cancel()
      if (!character || !onOpenSettings || event.pointerType !== 'touch' || !event.isPrimary) return
      const trigger = event.currentTarget
      const controller = new AbortController()
      const timer = setTimeout(() => {
        cancel()
        suppressClick.current = true
        onOpenSettings(character, trigger)
      }, 500)
      press.current = { x: event.clientX, y: event.clientY, timer, controller }
      window.addEventListener('scroll', cancel, { capture: true, signal: controller.signal })
    }}
    onPointerMove={(event) => {
      if (press.current && Math.hypot(event.clientX - press.current.x, event.clientY - press.current.y) > 10) cancel()
    }}
    onPointerUp={cancel} onPointerCancel={cancel} onPointerLeave={cancel}
    onContextMenu={(event) => {
      if (!character || !onOpenSettings) return
      event.preventDefault()
      cancel()
      if (!suppressClick.current) onOpenSettings(character, event.currentTarget)
    }}
    onKeyDown={(event) => {
      if (character && onOpenSettings && (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey))) {
        event.preventDefault()
        onOpenSettings(character, event.currentTarget)
      }
    }}>{children}</button>
}
