import { useEffect, useRef, type Dispatch, type MouseEvent, type PointerEvent, type RefObject, type SetStateAction } from 'react'
import { panBy, zoomAt, type Point, type View } from './boardView.ts'
import { longPress } from './useLongPress.ts'

/** ホイール1ノッチ（deltaY 100）で約1.22倍。 */
const wheelRate = 0.002

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
const middle = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
/** 画面の座標を表示枠の左上からの座標にする。 */
function toFrame(element: HTMLElement, point: Point) {
  const rect = element.getBoundingClientRect()
  return { x: point.x - rect.left, y: point.y - rect.top }
}
/** 表示枠の大きさ（transform の影響を受けない、レイアウト上の大きさ）。 */
const frameSize = (element: HTMLElement) => ({ width: element.clientWidth, height: element.clientHeight })

/**
 * 盤面の表示操作（spec.md 2.4、#63）。表示枠に付ける。
 * - マウスの左・右ボタン、1本指のタッチ: 押した位置から長押しの許容量（10px）を超えて動いたらドラッグとして表示位置を動かす
 * - 2本指のタッチ: ピンチで拡大・縮小し、中点の移動で表示位置も動かす
 * - ホイール: カーソルの位置を基準に拡大・縮小し、ページはスクロールさせない
 * ドラッグ・ピンチを始めたら駒の長押しを取り消し（cancelPress）、離した後の click を1回だけ止める。
 */
export function useBoardGestures(frame: RefObject<HTMLDivElement | null>, setView: Dispatch<SetStateAction<View>>, cancelPress: () => void) {
  const pointers = useRef(new Map<number, Point>())
  const gesture = useRef<{ mode: 'press' | 'drag'; origin: Point; last: Point } | { mode: 'pinch'; distance: number; middle: Point } | null>(null)
  const suppressClick = useRef(false)

  const local = (point: Point) => toFrame(frame.current!, point)
  const size = () => frameSize(frame.current!)

  useEffect(() => {
    const element = frame.current!
    // React の onWheel は passive で preventDefault できないので、ネイティブの listener で受ける。
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const point = toFrame(element, { x: event.clientX, y: event.clientY })
      const current = frameSize(element)
      setView((view) => zoomAt(view, Math.exp(-event.deltaY * wheelRate), point, current))
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [frame, setView])

  const startPinch = () => {
    const [a, b] = [...pointers.current.values()] as [Point, Point]
    gesture.current = { mode: 'pinch', distance: distance(a, b), middle: middle(a, b) }
    cancelPress()
    suppressClick.current = true
  }

  return {
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0 && event.button !== 2) return
      // 盤面の外で離して pointerup が届かなかった同じ pointer は、古い操作として捨てて新しく始める。
      pointers.current.delete(event.pointerId)
      if (pointers.current.size >= 2) return
      const point = { x: event.clientX, y: event.clientY }
      if (pointers.current.size === 0) suppressClick.current = false
      pointers.current.set(event.pointerId, point)
      if (pointers.current.size === 2) startPinch()
      else gesture.current = { mode: 'press', origin: point, last: point }
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      if (!pointers.current.has(event.pointerId)) return
      // マウスのボタンを離した後（盤面の外で離した）の移動は、操作の終わりとして扱い、表示を動かさない。
      if (event.pointerType === 'mouse' && event.buttons === 0) {
        end(event.pointerId)
        return
      }
      const point = { x: event.clientX, y: event.clientY }
      pointers.current.set(event.pointerId, point)
      const current = gesture.current
      if (current === null) return
      if (current.mode === 'pinch') {
        const [a, b] = [...pointers.current.values()] as [Point, Point]
        const next = { distance: distance(a, b), middle: middle(a, b) }
        const bounds = size()
        const at = local(next.middle)
        setView((view) => zoomAt(panBy(view, next.middle.x - current.middle.x, next.middle.y - current.middle.y, bounds),
          next.distance / current.distance, at, bounds))
        gesture.current = { mode: 'pinch', ...next }
        return
      }
      if (current.mode === 'press') {
        if (distance(point, current.origin) <= longPress.tolerance) return
        current.mode = 'drag'
        cancelPress()
        suppressClick.current = true
        // 枠の外へ出ても動かし続けられるよう、ドラッグを始めてから枠で受ける（押した時点では受けず、タップの click を壊さない）。
        frame.current!.setPointerCapture?.(event.pointerId)
      }
      const bounds = size()
      const { last } = current
      setView((view) => panBy(view, point.x - last.x, point.y - last.y, bounds))
      current.last = point
    },
    onPointerUp: (event: PointerEvent<HTMLDivElement>) => end(event.pointerId),
    onPointerCancel: (event: PointerEvent<HTMLDivElement>) => end(event.pointerId),
    // ドラッグ・ピンチの後の click は、駒・マスへ届く前に1回だけ止める。キーボード（detail 0）は止めない。
    onClickCapture: (event: MouseEvent<HTMLDivElement>) => {
      if (!suppressClick.current || event.detail === 0) return
      suppressClick.current = false
      event.stopPropagation()
      event.preventDefault()
    },
    // 盤面の上ではブラウザのメニューを出さない（右ドラッグ中のメニューを含む）。駒の設定は useLongPress が開く。
    onContextMenu: (event: MouseEvent<HTMLDivElement>) => event.preventDefault(),
  }

  function end(pointerId: number) {
    if (!pointers.current.delete(pointerId)) return
    const rest = [...pointers.current.values()]
    if (rest.length === 1) {
      // ピンチの片方の指を離したら、残りの指はドラッグとして続ける（離した後にタップ扱いしない）。
      gesture.current = { mode: 'drag', origin: rest[0]!, last: rest[0]! }
    } else if (rest.length === 0) {
      gesture.current = null
    }
  }
}
