import { useRef, type Dispatch, type PointerEvent, type SetStateAction } from 'react'
import { formatPosition, getBoardPositions } from '../domain/board.ts'
import type { BoardSize, Position } from '../domain/movement.ts'
import { getSelectedMovementRange, type BoardState } from '../domain/selection.ts'
import { pieceDetails, tokenClass } from './piece.ts'
import { initialView, type View } from './boardView.ts'
import { axisLabels } from './boardLabels.ts'
import { useBoardGestures } from './useBoardGestures.ts'
import { useLongPress } from './useLongPress.ts'
import './Board.css'

const keyOf = (position: Position) => `${position.x},${position.y}`

const ignoreView: Dispatch<SetStateAction<View>> = () => {}

/** 固定帯。番号の箱だけを端へ寄せ、目盛と引出線の先端は対応するマス内に残す。 */
function CoordinateLabels({ length, count, scale, offset, horizontal }: {
  length: number; count: number; scale: number; offset: number; horizontal: boolean
}) {
  // DOMを測る前にも1〜Nの意味上のラベルを置く。実ブラウザではlayout effectで描画前に実測へ切り替わる。
  const labels = length === 0
    ? Array.from({ length: count }, (_, index) => ({ number: index + 1, start: 0, end: 0, anchor: 0, center: 0 }))
    : axisLabels(length, count, scale, offset)
  return <div className={`board-labels ${horizontal ? 'board-columns' : 'board-rows'}`} role="group" aria-label={horizontal ? '横の座標' : '縦の座標'}>
    {length > 0 && <svg aria-hidden="true" viewBox={horizontal ? `0 0 ${length} 24` : `0 0 24 ${length}`} preserveAspectRatio="none">
      {labels.map(({ number, start, end, anchor, center }) => <g key={number}>
        <path d={horizontal ? `M${start} 18V24M${end} 18V24` : `M18 ${start}H24M18 ${end}H24`} />
        <line className="board-label-leader" data-number={number}
          x1={horizontal ? center : 20} y1={horizontal ? 20 : center}
          x2={horizontal ? anchor : 24} y2={horizontal ? 24 : anchor} />
      </g>)}
    </svg>}
    {labels.map(({ number, center }) => <span className="board-label" key={number}
      style={{ [horizontal ? 'left' : 'top']: length === 0 ? `${(number - 0.5) * 100 / count}%` : `${center}px` }}>{number}</span>)}
  </div>
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
  const frame = useRef<HTMLDivElement>(null)
  const surface = useRef<HTMLDivElement>(null)
  const { bounds, bind: gestures } = useBoardGestures(frame, surface, onViewChange, cancelPress)
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    notePointerDown(event)
    gestures.onPointerDown(event)
  }
  const { selection } = state
  const occupants = new Map(state.characters.flatMap((character) => character.position === null
    ? [] : [[keyOf(character.position), character] as const]))
  const range = new Set(getSelectedMovementRange(state, size).map(keyOf))
  const columns = { gridTemplateColumns: `repeat(${size.width}, minmax(0, 1fr))` }

  return (
    // #67: 帯/角も表示操作を受けるが、倍率/移動の基準と切り取りはマス枠。帯のタップでマス操作は起こさない。
    <div className="board-frame" ref={surface} style={{ touchAction: view.scale > 1 ? 'none' : 'pan-y' }} {...gestures} onPointerDown={onPointerDown}>
      <div className="board-corner" aria-hidden="true" />
      <CoordinateLabels horizontal length={bounds.width} count={size.width} scale={view.scale} offset={view.x} />
      <CoordinateLabels horizontal={false} length={bounds.height} count={size.height} scale={view.scale} offset={view.y} />
      <div className="board-viewport" ref={frame} style={{ touchAction: view.scale > 1 ? 'none' : 'pan-y' }}>
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
