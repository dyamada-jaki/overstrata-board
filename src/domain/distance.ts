import type { Position } from './types.ts'

/**
 * 2つのマスの間の移動の距離（spec.md 3.1）。
 * 縦・横は1マス=1、斜めは 1, 2, 1, 2… と交互に数える。
 */
export function distance(from: Position, to: Position): number {
  const dx = Math.abs(to.x - from.x)
  const dy = Math.abs(to.y - from.y)
  return Math.max(dx, dy) + Math.floor(Math.min(dx, dy) / 2)
}
