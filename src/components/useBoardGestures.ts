import { useEffect, useRef, type RefObject, type PointerEvent, type MouseEvent, type KeyboardEvent } from 'react'
import { constrainView, zoomView, type BoardView, type ViewPoint } from './boardView.ts'
import { longPress } from './useLongPress.ts'

interface PieceTarget { id: string; element: HTMLElement }
interface Gesture {
  origin: ViewPoint
  view: BoardView
  piece: PieceTarget | null
  button: number
  dragging: boolean
  blocked: boolean
}
const point = (event: { clientX: number; clientY: number }): ViewPoint => ({ x: event.clientX, y: event.clientY })
const distance = (a: ViewPoint, b: ViewPoint) => Math.hypot(a.x - b.x, a.y - b.y)
const midpoint = (a: ViewPoint, b: ViewPoint): ViewPoint => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

/** 盤面内の表示操作と駒の補助操作を調停する。駒・選択の状態は変更しない。 */
export function useBoardGestures(ref: RefObject<HTMLDivElement | null>, view: BoardView,
  onChange: (view: BoardView) => void, onOpen: (id: string, element: HTMLElement) => void) {
  const currentView = useRef(view)
  const callbacks = useRef({ onChange, onOpen })
  const pointers = useRef(new Map<number, ViewPoint>())
  const gesture = useRef<Gesture | null>(null)
  const pinch = useRef<{ from: ViewPoint; distance: number; view: BoardView } | null>(null)
  const timer = useRef<number | null>(null)
  const suppressClick = useRef(false)
  useEffect(() => { currentView.current = view; callbacks.current = { onChange, onOpen } }, [view, onChange, onOpen])

  const cancelLongPress = () => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
  }
  const change = (next: BoardView) => {
    currentView.current = next
    callbacks.current.onChange(next)
  }
  const bounds = () => ref.current!.getBoundingClientRect()
  const local = (p: ViewPoint): ViewPoint => {
    const r = bounds()
    return { x: p.x - r.left, y: p.y - r.top }
  }
  const findPiece = (target: EventTarget | null): PieceTarget | null => {
    const element = target instanceof Element ? target.closest<HTMLElement>('[data-piece-id]') : null
    return element?.dataset.pieceId ? { id: element.dataset.pieceId, element } : null
  }
  const open = (piece: PieceTarget) => callbacks.current.onOpen(piece.id, piece.element)
  const block = () => {
    cancelLongPress()
    suppressClick.current = true
    if (gesture.current) gesture.current.blocked = true
  }
  const cancel = () => {
    block()
    pointers.current.clear()
    gesture.current = null
    pinch.current = null
  }

  useEffect(() => {
    const element = ref.current!
    // Reactのwheelリスナーはpassiveになる。倍率の上下限でもページへ流さないためnativeで登録する。
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      block()
      const r = bounds()
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? r.height : 1
      const anchor = local(point(event))
      change(zoomView(currentView.current, currentView.current.scale * Math.exp(-event.deltaY * unit * 0.002), anchor, anchor, r))
    }
    const resize = () => change(constrainView(currentView.current, bounds()))
    const scroll = () => cancelLongPress()
    element.addEventListener('wheel', wheel, { passive: false })
    window.addEventListener('resize', resize)
    window.addEventListener('scroll', scroll, true)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize)
    observer?.observe(element)
    return () => {
      cancelLongPress()
      observer?.disconnect()
      element.removeEventListener('wheel', wheel)
      window.removeEventListener('resize', resize)
      window.removeEventListener('scroll', scroll, true)
    }
    // 入力中の値はrefで読む。リスナーを描画ごとに張り替えない。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref])

  return {
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 && event.button !== 2) return
      const p = point(event)
      pointers.current.set(event.pointerId, p)
      cancelLongPress()
      if (pointers.current.size === 1) {
        suppressClick.current = false
        const piece = findPiece(event.target)
        gesture.current = { origin: p, view: currentView.current, piece, button: event.button, dragging: false, blocked: false }
        if (piece && (event.pointerType === 'touch' || event.pointerType === 'pen')) {
          timer.current = window.setTimeout(() => { block(); open(piece) }, longPress.delay)
        }
      } else {
        block()
        const [a, b] = [...pointers.current.values()]
        pinch.current = { from: local(midpoint(a!, b!)), distance: distance(a!, b!), view: currentView.current }
        // ピンチまたは10pxを超えたドラッグからcaptureする。通常のタップのclick先は変えない。
        for (const id of pointers.current.keys()) event.currentTarget.setPointerCapture?.(id)
      }
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      if (!pointers.current.has(event.pointerId)) return
      const p = point(event)
      pointers.current.set(event.pointerId, p)
      const current = gesture.current!
      if (pinch.current && pointers.current.size >= 2) {
        const [a, b] = [...pointers.current.values()]
        const start = pinch.current
        if (start.distance > 0) change(zoomView(start.view, start.view.scale * distance(a!, b!) / start.distance, start.from, local(midpoint(a!, b!)), bounds()))
      } else {
        if (!current.dragging && distance(p, current.origin) <= longPress.tolerance) return
        if (!current.dragging) {
          // 長押し済みの操作から、モーダルの背後で表示移動を始めない。
          if (current.blocked) return
          current.dragging = true
          block()
          event.currentTarget.setPointerCapture?.(event.pointerId)
        }
        change(constrainView({ ...current.view, x: current.view.x + p.x - current.origin.x, y: current.view.y + p.y - current.origin.y }, bounds()))
      }
    },
    onPointerUp: (event: PointerEvent<HTMLDivElement>) => {
      if (!pointers.current.has(event.pointerId)) return
      cancelLongPress()
      const current = gesture.current!
      pointers.current.delete(event.pointerId)
      if (pointers.current.size === 0) {
        if (current.button === 2 && !current.blocked && current.piece) { block(); open(current.piece) }
        gesture.current = null
        pinch.current = null
      } else if (pointers.current.size === 1) {
        pinch.current = null
        current.origin = [...pointers.current.values()][0]!
        current.view = currentView.current
        current.dragging = true
      }
    },
    onPointerCancel: cancel,
    onLostPointerCapture: (event: PointerEvent<HTMLDivElement>) => { if (pointers.current.has(event.pointerId)) cancel() },
    onClickCapture: (event: MouseEvent<HTMLDivElement>) => {
      // キーボードのEnter/Space（detail=0）は表示ジェスチャーの続きではない。
      if (suppressClick.current && event.detail !== 0) { event.preventDefault(); event.stopPropagation() }
    },
    onContextMenu: (event: MouseEvent<HTMLDivElement>) => {
      event.preventDefault()
      // マウスのcontextmenuはOSによってdown/up時に来る。右の操作はpointerupだけで確定する。
      if (event.button === 2 || pointers.current.size > 0) return
      const piece = findPiece(event.target)
      if (piece) { cancelLongPress(); open(piece) }
    },
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'ContextMenu' && !(event.key === 'F10' && event.shiftKey)) return
      const piece = findPiece(event.target)
      if (piece) { event.preventDefault(); cancelLongPress(); open(piece) }
    },
    onDragStart: (event: React.DragEvent<HTMLDivElement>) => event.preventDefault(),
  }
}
