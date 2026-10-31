import { useCallback, useEffect, useRef, type MouseEvent, type PointerEvent } from 'react'

/** 長押しの判定時間（ms）と、取り消すまでに許す指の移動量（px）。#45 の計画で決めた値。 */
export const longPress = { delay: 500, tolerance: 10 }

interface Press { readonly x: number; readonly y: number; readonly timer: number }

/**
 * 駒の長押し（タッチ・ペン）と右クリック（contextmenu）で onOpen を呼ぶ。Android の長押しも contextmenu で届く。
 * 指を動かした・スクロールが始まった（pointercancel・scroll）・判定時間より前に離した場合は取り消す。
 * 長押しで開いた直後に同じ操作で届く click は、選択の解除にならないよう無視する。
 */
export function useLongPress(onOpen: (id: string, element: HTMLElement) => void) {
  const press = useRef<Press | null>(null)
  const opened = useRef<string | null>(null)
  // scroll の登録と解除で同じ関数を使うため、描画ごとに作り直さない。
  const cancel = useCallback(function cancelPress() {
    if (press.current) window.clearTimeout(press.current.timer)
    press.current = null
    window.removeEventListener('scroll', cancelPress, true)
  }, [])
  useEffect(() => cancel, [cancel])

  return (id: string, onClick: () => void) => ({
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      cancel()
      opened.current = null
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return
      const element = event.currentTarget
      const timer = window.setTimeout(() => {
        cancel()
        opened.current = id
        onOpen(id, element)
      }, longPress.delay)
      press.current = { x: event.clientX, y: event.clientY, timer }
      window.addEventListener('scroll', cancel, true)
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const current = press.current
      if (current && Math.hypot(event.clientX - current.x, event.clientY - current.y) > longPress.tolerance) cancel()
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onContextMenu: (event: MouseEvent<HTMLElement>) => {
      event.preventDefault()
      cancel()
      onOpen(id, event.currentTarget)
    },
    onClick: (event: MouseEvent<HTMLElement>) => {
      // キーボードの Enter・Space（detail 0）は長押しの続きではないので、そのまま選択に使う。
      if (opened.current === id && event.detail !== 0) {
        opened.current = null
        return
      }
      onClick()
    },
  })
}
