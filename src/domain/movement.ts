import { movementRules } from '../data/movement.ts'

/** 左上を (0, 0) とする整数のマス座標。 */
export interface Position {
  readonly x: number
  readonly y: number
}

/** 正の整数で指定する盤面の横・縦のマス数。 */
export interface BoardSize {
  readonly width: number
  readonly height: number
}

export type Armor = keyof typeof movementRules.armorModifiers

/** 縦横は1、斜めは1・2を交互に数える移動距離（spec.md 3.1）。 */
export function getDistance(from: Position, to: Position): number {
  const dx = Math.abs(to.x - from.x)
  const dy = Math.abs(to.y - from.y)
  return Math.max(dx, dy) + Math.floor(Math.min(dx, dy) / 2)
}

export function getMovement(armor: Armor): number {
  return movementRules.base + movementRules.armorModifiers[armor]
}

/**
 * 範囲表示用のマス一覧を上の行から左→右の順に返す。
 * 盤面内の現在地と移動力、他キャラの位置、盤面サイズを受け取る。
 * 現在地・他キャラのマスは除外し、通り道は判定しない。
 * 実際の移動先の可否とは別で、移動操作を制限するためには使わない。
 */
export function getMovementRange(
  origin: Position,
  movement: number,
  otherPositions: readonly Position[],
  boardSize: BoardSize,
): Position[] {
  const range: Position[] = []

  for (let y = 0; y < boardSize.height; y += 1) {
    for (let x = 0; x < boardSize.width; x += 1) {
      if (x === origin.x && y === origin.y) continue
      if (otherPositions.some((position) => position.x === x && position.y === y)) {
        continue
      }

      const position = { x, y }
      if (getDistance(origin, position) <= movement) {
        range.push(position)
      }
    }
  }

  return range
}

/**
 * 実際の移動先の可否（spec.md 2.3）。盤面内の空きマスなら移動範囲の外でもよい。
 * occupiedPositions には移動するキャラ自身を含む全キャラの位置を渡す。
 */
export function canMoveTo(
  target: Position,
  occupiedPositions: readonly Position[],
  boardSize: BoardSize,
): boolean {
  const inside = target.x >= 0 && target.x < boardSize.width
    && target.y >= 0 && target.y < boardSize.height
  return inside && !occupiedPositions.some((position) => position.x === target.x && position.y === target.y)
}
