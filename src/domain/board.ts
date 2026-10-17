import type { BoardSize, Position } from './movement.ts'

/** 内部座標を、1始まりの正規表記「(横, 縦)」へ変換する。 */
export function formatPosition(position: Position): string {
  return `(${position.x + 1}, ${position.y + 1})`
}

/** 正規表記だけを内部座標へ戻す。現在の盤面サイズには依存しない。 */
export function parsePosition(label: string): Position | null {
  const match = /^\(([1-9]\d*), ([1-9]\d*)\)$/.exec(label)
  if (!match) return null

  const position = { x: Number(match[1]) - 1, y: Number(match[2]) - 1 }
  return formatPosition(position) === label ? position : null
}

/** 指定された盤面の座標を、上の行から左→右の順に返す。 */
export function getBoardPositions(size: BoardSize): Position[] {
  const positions: Position[] = []
  for (let y = 0; y < size.height; y += 1) {
    for (let x = 0; x < size.width; x += 1) {
      positions.push({ x, y })
    }
  }
  return positions
}
