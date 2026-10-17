import type { Position } from './movement.ts'

/**
 * 空きマスをタップしたあとの選択（spec.md 2.1）。
 * 選択中のマスを再タップすると解除し、それ以外はタップしたマスを選択する。
 */
export function selectCell(selected: Position | null, tapped: Position): Position | null {
  if (selected && selected.x === tapped.x && selected.y === tapped.y) return null
  return tapped
}
