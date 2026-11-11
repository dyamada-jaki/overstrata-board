import { useRef } from 'react'
import { Board } from './Board.tsx'
import type { BoardSize, Position } from '../domain/movement.ts'
import type { BoardState } from '../domain/selection.ts'
import { wholeBoard, type BoardView } from './boardView.ts'
import { useBoardGestures } from './useBoardGestures.ts'

export function BoardViewport({ size, state, view, onViewChange, onTap, onOpenSettings }: {
  size: BoardSize
  state: BoardState
  view: BoardView
  onViewChange: (view: BoardView) => void
  onTap: (position: Position) => void
  onOpenSettings: (id: string, element: HTMLElement) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const handlers = useBoardGestures(ref, view, onViewChange, onOpenSettings)
  return <>
    <div className="board-view-controls">
      <span>倍率 {view.scale.toFixed(1)}倍</span>
      <button type="button" onClick={() => onViewChange(wholeBoard)}>全体を見る</button>
    </div>
    <p className="board-view-help" id="board-view-help">2本指のピンチ／ホイールで拡大・縮小。拡大後はドラッグで表示を移動（PCは左・右ボタン）。ページの縦スクロールは1倍の盤面上か盤面の外から。</p>
    <div ref={ref} className="board-viewport" role="group" aria-label="盤面の表示領域" aria-describedby="board-view-help"
      style={{ touchAction: view.scale === 1 ? 'pan-y' : 'none' }} {...handlers}>
      <div className="board-transform" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}>
        <Board size={size} state={state} onTap={onTap} />
      </div>
    </div>
  </>
}
