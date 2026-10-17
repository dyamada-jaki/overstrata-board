import type { Position } from './movement.ts'

const positionPattern = /^\(([1-9]\d*), ([1-9]\d*)\)$/

/** 0始まりの内部座標を、1始まりの `(横, 縦)` の表示文字列にする（spec.md 2.1）。 */
export function formatPosition(position: Position): string {
  return `(${position.x + 1}, ${position.y + 1})`
}

/**
 * 1始まりの `(横, 縦)` の表示文字列を、0始まりの内部座標に戻す（spec.md 2.1）。
 * 正規の表記でなければ null を返す。盤面の範囲は判定しない。
 */
export function parsePosition(text: string): Position | null {
  const match = positionPattern.exec(text)
  if (!match) return null
  return { x: Number(match[1]) - 1, y: Number(match[2]) - 1 }
}
