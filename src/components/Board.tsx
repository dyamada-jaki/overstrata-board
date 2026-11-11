import { useRef, type Dispatch, type SetStateAction } from 'react'
import { formatPosition, getBoardPositions } from '../domain/board.ts'
import type { BoardSize, Position } from '../domain/movement.ts'
import { getSelectedMovementRange, type BoardState } from '../domain/selection.ts'
import { pieceDetails, tokenClass } from './piece.ts'
import { initialView, type View } from './boardView.ts'
import { useBoardGestures } from './useBoardGestures.ts'
import { useLongPress } from './useLongPress.ts'
import './Board.css'

const keyOf = (position: Position) => `${position.x},${position.y}`

const ignoreView: Dispatch<SetStateAction<View>> = () => {}

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
  const { bind: pieceHandlers, cancel: cancelPress } = useLongPress(onOpenSettings)
  const frame = useRef<HTMLDivElement>(null)
  const gestures = useBoardGestures(frame, onViewChange, cancelPress)
  const { selection } = state
  const occupants = new Map(state.characters.flatMap((character) => character.position === null
    ? [] : [[keyOf(character.position), character] as const]))
  const range = new Set(getSelectedMovementRange(state, size).map(keyOf))
  const columns = { gridTemplateColumns: `repeat(${size.width}, minmax(0, 1fr))` }

  return (
    // 表示枠。1倍は盤面の上から縦にページをスクロールでき、拡大中は1本指のドラッグを表示位置の移動に使う（計画承認時の人間の決定）。
    <div className="board-viewport" ref={frame} style={{ touchAction: view.scale > 1 ? 'none' : 'pan-y' }} {...gestures}>
      <div className="board" role="group" aria-label="戦闘盤面"
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}>
        <div className="board-columns" role="group" aria-label="横の座標" style={columns}>
          {Array.from({ length: size.width }, (_, x) => <span key={x}>{x + 1}</span>)}
        </div>
        <div className="board-rows" role="group" aria-label="縦の座標"
          style={{ gridTemplateRows: `repeat(${size.height}, minmax(0, 1fr))` }}>
          {Array.from({ length: size.height }, (_, y) => <span key={y}>{y + 1}</span>)}
        </div>
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
  )
}
