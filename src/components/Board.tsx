import { useLayoutEffect, useRef, useState, type Dispatch, type PointerEvent, type SetStateAction } from 'react'
import { formatPosition, getBoardPositions } from '../domain/board.ts'
import type { BoardSize, Position } from '../domain/movement.ts'
import { getSelectedMovementRange, type BoardState } from '../domain/selection.ts'
import { pieceDetails, tokenClass } from './piece.ts'
import { axisLabels, initialView, type Frame, type View } from './boardView.ts'
import { frameSize, useBoardGestures } from './useBoardGestures.ts'
import { useLongPress } from './useLongPress.ts'
import './Board.css'

const keyOf = (position: Position) => `${position.x},${position.y}`

const ignoreView: Dispatch<SetStateAction<View>> = () => {}

/**
 * 表示枠の上端（列）・左端（行）に残す座標の番号（#67）。拡大・移動する盤面の外に置き、View と表示枠の大きさから位置を計算する。
 * 表示枠をまだ測れていない間（描画前。jsdom も同じ）は、マスと同じ等分の並びで 1〜count をすべて並べる。
 */
function AxisNumbers({ name, count, scale, offset, length }: {
  name: '横の座標' | '縦の座標'
  count: number
  scale: number
  offset: number
  length: number
}) {
  const columns = name === '横の座標'
  const className = columns ? 'board-columns' : 'board-rows'
  if (length <= 0) {
    const tracks = `repeat(${count}, minmax(0, 1fr))`
    return (
      <div className={className} role="group" aria-label={name}
        style={columns ? { gridTemplateColumns: tracks } : { gridTemplateRows: tracks }}>
        {Array.from({ length: count }, (_, index) => <span key={index}>{index + 1}</span>)}
      </div>
    )
  }
  return (
    <div className={`${className} board-axis-measured`} role="group" aria-label={name}>
      {axisLabels(count, scale, offset, length).map(({ number, start, size }) => (
        <span key={number} style={columns ? { left: `${start}px`, width: `${size}px` } : { top: `${start}px`, height: `${size}px` }}>
          {number}
        </span>
      ))}
    </div>
  )
}

export function Board({ size, state, onTap, onOpenSettings = () => {}, view = initialView, onViewChange = ignoreView }: {
  size: BoardSize
  state: BoardState
  onTap: (position: Position) => void
  /** 駒の長押し・右クリック。駒の設定を開くことを通知する（#45）。 */
  onOpenSettings?: (id: string, element: HTMLElement) => void
  /** 倍率と表示位置（#63）。状態は App が持ち、盤面は表示と操作の通知だけを行う。 */
  view?: View
  onViewChange?: Dispatch<SetStateAction<View>>
}) {
  const { bind: pieceHandlers, cancel: cancelPress, notePointerDown } = useLongPress(onOpenSettings)
  const area = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const gestures = useBoardGestures(area, frame, onViewChange, cancelPress)
  // 座標の番号を置くための表示枠の実測値（ゲームや画面の状態ではないので App には上げない）。最初の描画と表示が変わるたびに
  // 描画前に測り、変わったときだけ更新する。表示枠の大きさの変化は useBoardGestures の収め直しが View を更新するので、ここで測り直す。
  const [measured, setMeasured] = useState<Frame>({ width: 0, height: 0 })
  useLayoutEffect(() => {
    const next = frameSize(frame.current!)
    setMeasured((current) => current.width === next.width && current.height === next.height ? current : next)
  }, [view, size])
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    notePointerDown(event)
    gestures.onPointerDown(event)
  }
  const { selection } = state
  const occupants = new Map(state.characters.flatMap((character) => character.position === null
    ? [] : [[keyOf(character.position), character] as const]))
  const range = new Set(getSelectedMovementRange(state, size).map(keyOf))
  const columns = { gridTemplateColumns: `repeat(${size.width}, minmax(0, 1fr))` }
  // 1倍は盤面の上から縦にページをスクロールでき、拡大中は1本指のドラッグを表示位置の移動に使う（#63 の計画承認時の人間の決定）。
  const touchAction = view.scale > 1 ? 'none' : 'pan-y'

  return (
    // 操作を受ける範囲。番号の帯と角を含め、帯の上から始めたドラッグ・ピンチ・ホイールも盤面の表示に使う（#67）。
    // 右ボタンの押下の記録（notePointerDown）とブラウザのメニューの抑止（onContextMenu）もここで受ける（ADR 0009）。
    <div className="board-area" ref={area} style={{ touchAction }} {...gestures} onPointerDown={onPointerDown}>
      <div className="board-corner" aria-hidden="true" />
      <AxisNumbers name="横の座標" count={size.width} scale={view.scale} offset={view.x} length={measured.width} />
      <AxisNumbers name="縦の座標" count={size.height} scale={view.scale} offset={view.y} length={measured.height} />
      {/* マスの表示枠。拡大・移動した盤面を切り取り、指・カーソルの位置と大きさの基準にする（#63）。 */}
      <div className="board-viewport" ref={frame} style={{ touchAction }}>
        <div className="board" role="group" aria-label="戦闘盤面"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}>
          <div className="board-cells" style={columns}>
            {getBoardPositions(size).map((position) => {
              const key = keyOf(position)
              const occupant = occupants.get(key)
              const inRange = range.has(key)
              const selected = occupant
                ? selection.kind === 'character' && selection.id === occupant.id
                : selection.kind === 'cell' && keyOf(selection.position) === key
              const label = [
                `マス ${formatPosition(position)}`,
                occupant && `${occupant.name}（${pieceDetails(occupant)}）`,
                inRange && '移動範囲',
              ].filter(Boolean).join(' ')
              return (
                <button key={key} type="button"
                  className={inRange ? 'board-cell board-cell-range' : 'board-cell'}
                  aria-label={label} aria-pressed={selected} data-piece-id={occupant?.id}
                  {...(occupant ? pieceHandlers(occupant.id, () => onTap(position)) : { onClick: () => onTap(position) })}>
                  {occupant && <span className={tokenClass(occupant)}>{occupant.number}</span>}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
