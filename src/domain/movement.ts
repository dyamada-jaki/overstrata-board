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

/** 移動範囲を求める際の、配置済みの他の駒。 */
export interface MovementOccupant {
  readonly position: Position
  readonly downed: boolean
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
 * 他の駒を避けて移動力以内で到達できる空きマスを、行→列順に返す。
 * 通常の駒は通過不可、倒れた駒は通過のみ可能（spec.md 2.3）。
 * 実際の移動先の可否とは別で、移動操作を制限するためには使わない。
 */
export function getMovementRange(
  origin: Position,
  movement: number,
  otherPieces: readonly MovementOccupant[],
  boardSize: BoardSize,
): Position[] {
  const positionKey = ({ x, y }: Position) => `${x},${y}`
  const stateKey = (position: Position, parity: number) => `${positionKey(position)},${parity}`
  const occupied = new Set(otherPieces.map(({ position }) => positionKey(position)))
  const blocked = new Set(otherPieces.filter(({ downed }) => !downed).map(({ position }) => positionKey(position)))
  const costs = new Map([[stateKey(origin, 0), 0]])
  const queue = [{ position: origin, parity: 0, cost: 0 }]

  // 座標と斜め回数の偶奇ごとに、必要コストが小さくなったときだけ再探索する。
  // 縦横を挟んでも偶奇を保つ。同じマスの別の偶奇も捨てずに最少コストを求める。
  for (const { position, parity, cost } of queue) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue
        const next = { x: position.x + dx, y: position.y + dy }
        if (next.x < 0 || next.x >= boardSize.width || next.y < 0 || next.y >= boardSize.height) continue
        if (blocked.has(positionKey(next))) continue
        const diagonal = dx !== 0 && dy !== 0
        if (diagonal
          && blocked.has(positionKey({ x: next.x, y: position.y }))
          && blocked.has(positionKey({ x: position.x, y: next.y }))) continue

        const nextCost = cost + (diagonal ? 1 + parity : 1)
        const nextParity = diagonal ? 1 - parity : parity
        const key = stateKey(next, nextParity)
        if (nextCost > movement || nextCost >= (costs.get(key) ?? Infinity)) continue
        costs.set(key, nextCost)
        queue.push({ position: next, parity: nextParity, cost: nextCost })
      }
    }
  }

  const range: Position[] = []
  for (let y = 0; y < boardSize.height; y += 1) {
    for (let x = 0; x < boardSize.width; x += 1) {
      if (x === origin.x && y === origin.y) continue
      const position = { x, y }
      if (occupied.has(positionKey(position))) continue
      if (costs.has(stateKey(position, 0)) || costs.has(stateKey(position, 1))) range.push(position)
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
