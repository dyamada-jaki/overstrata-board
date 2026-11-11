import { useCallback, useEffect, useRef, type MouseEvent, type PointerEvent } from 'react'

/** 長押しの判定時間（ms）と、取り消すまでに許す指の移動量（px）。#45 の計画で決めた値。#63 の盤面のドラッグ開始にも同じ量を使う。 */
export const longPress = { delay: 500, tolerance: 10 }

/** 押している操作。タッチ・ペンは長押しの計時（timer）、マウスの右ボタンは離したときに開く（timer なし）。 */
interface Press { readonly x: number; readonly y: number; readonly timer?: number; readonly element?: HTMLElement }

/**
 * 駒の長押し（タッチ・ペン）と右クリックで onOpen を呼ぶ。
 * 指を動かした・スクロールが始まった（pointercancel・scroll）・判定時間より前に離した場合は取り消す。
 * 盤面のドラッグ・ピンチの開始でも、返す cancel で取り消す（#63）。
 * 長押しで開いた直後に同じ操作で届く click は、選択の解除にならないよう無視する。
 *
 * マウスの右ボタンは、押して 10px 以内で離したとき（pointerup）に開く（#63。ADR 0007 からの変更）。
 * macOS・Linux の Chromium は右ボタンを押した時点で contextmenu を出すため、そこで開くと右ドラッグの前に開いてしまう。
 * マウス由来の contextmenu はブラウザのメニューを止めるだけにし、Windows の「離した後の contextmenu」でも二重に開かない。
 * キーボード（Shift+F10・メニューキー）と Android の長押しの contextmenu は、マウスの押下を伴わないので従来どおり開く。
 */
export function useLongPress(onOpen: (id: string, element: HTMLElement) => void) {
  const press = useRef<Press | null>(null)
  const opened = useRef<string | null>(null)
  /** マウスの右ボタンを押した後、まだ届いていない contextmenu がある。 */
  const mouseMenu = useRef(false)
  // scroll の登録と解除で同じ関数を使うため、描画ごとに作り直さない。
  const cancel = useCallback(function cancelPress() {
    if (press.current) window.clearTimeout(press.current.timer)
    press.current = null
    window.removeEventListener('scroll', cancelPress, true)
  }, [])
  useEffect(() => cancel, [cancel])

  /**
   * マウスの右ボタンを押したことを覚える。盤面では空きマスから始めた右ドラッグも、離した後に駒へ届く contextmenu で開かないよう、
   * 表示枠の pointerdown からも呼ぶ（#63）。
   */
  const notePointerDown = (event: PointerEvent<HTMLElement>) => {
    const rightButton = event.pointerType === 'mouse' && event.button === 2
    mouseMenu.current = rightButton
    return rightButton
  }

  const bind = (id: string, onClick: () => void) => ({
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      cancel()
      opened.current = null
      const element = event.currentTarget
      const rightButton = notePointerDown(event)
      if (rightButton) {
        press.current = { x: event.clientX, y: event.clientY, element }
        return
      }
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return
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
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      const element = press.current?.element
      cancel()
      if (element && event.button === 2) onOpen(id, element)
    },
    onPointerCancel: cancel,
    onContextMenu: (event: MouseEvent<HTMLElement>) => {
      event.preventDefault()
      if (mouseMenu.current) {
        mouseMenu.current = false
        return
      }
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
  return { bind, cancel, notePointerDown }
}
