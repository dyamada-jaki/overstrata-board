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

/** 移動する駒以外の配置済みの駒の位置を、通常状態と倒れた状態に分けたもの（spec.md 2.3）。 */
export interface OtherPieces {
  readonly normal: readonly Position[]
  readonly downed: readonly Position[]
}

const steps = [-1, 0, 1].flatMap((dy) => [-1, 0, 1].map((dx) => ({ dx, dy })))
  .filter(({ dx, dy }) => dx !== 0 || dy !== 0)

/**
 * 範囲表示用のマス一覧を上の行から左→右の順に返す（spec.md 2.3「他の駒を避ける移動範囲」・3.1）。
 * 盤面内の現在地と移動力、他の駒の位置、盤面サイズを受け取る。
 * 通常の駒のマスは通らず、倒れた駒のマスは通過だけする。斜めの一歩は脇の2マスが両方とも通常の駒なら通れない。
 * 縦横は1、斜めは通り道での1回目が1・2回目が2…と数え、最も少ない移動力で届く空きマスを返す。現在地は含めない。
 * 実際の移動先の可否とは別で、移動操作を制限するためには使わない。
 */
export function getMovementRange(
  origin: Position,
  movement: number,
  others: OtherPieces,
  boardSize: BoardSize,
): Position[] {
  const { width, height } = boardSize
  const indexOf = (x: number, y: number) => y * width + x
  const blocked = new Set(others.normal.map(({ x, y }) => indexOf(x, y)))
  const occupied = new Set([...blocked, ...others.downed.map(({ x, y }) => indexOf(x, y))])
  const inside = (x: number, y: number) => x >= 0 && x < width && y >= 0 && y < height

  // 状態はマスと「これまでの斜めの回数が奇数か」。斜めの費用が順番で変わるため、偶奇ごとに最小値を持つ。
  const costs = new Map<number, number>()
  const costOf = (index: number, odd: number) => costs.get(index * 2 + odd) ?? Infinity
  const buckets: { x: number; y: number; odd: number }[][] = Array.from({ length: movement + 1 }, () => [])
  const visit = (x: number, y: number, odd: number, cost: number) => {
    if (cost > movement || cost >= costOf(indexOf(x, y), odd)) return
    costs.set(indexOf(x, y) * 2 + odd, cost)
    buckets[cost]?.push({ x, y, odd })
  }
  visit(origin.x, origin.y, 0, 0)

  buckets.forEach((bucket, cost) => {
    for (const { x, y, odd } of bucket) {
      if (costOf(indexOf(x, y), odd) < cost) continue
      for (const { dx, dy } of steps) {
        const nx = x + dx
        const ny = y + dy
        if (!inside(nx, ny) || blocked.has(indexOf(nx, ny))) continue
        const diagonal = dx !== 0 && dy !== 0
        if (!diagonal) {
          visit(nx, ny, odd, cost + 1)
        } else if (!blocked.has(indexOf(nx, y)) || !blocked.has(indexOf(x, ny))) {
          visit(nx, ny, 1 - odd, cost + 1 + odd)
        }
      }
    }
  })

  const range: Position[] = []
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = indexOf(x, y)
      if (x === origin.x && y === origin.y) continue
      if (occupied.has(index)) continue
      if (Math.min(costOf(index, 0), costOf(index, 1)) <= movement) range.push({ x, y })
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
