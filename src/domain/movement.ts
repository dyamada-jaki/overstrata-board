import { ARMOR_MOVEMENT_MODIFIER, BASE_MOVEMENT } from '../data/movement.ts'
import { distance } from './distance.ts'
import type { Armor, BoardSize, Position } from './types.ts'

/** 装備の重さから移動力を出す（spec.md 3.2） */
export function movementForArmor(armor: Armor): number {
  return BASE_MOVEMENT + ARMOR_MOVEMENT_MODIFIER[armor]
}

export interface ReachableInput {
  /** 動かすキャラのいるマス */
  from: Position
  /** 移動力 */
  movement: number
  /** 他のキャラがいるマス */
  occupied: readonly Position[]
  board: BoardSize
}

/**
 * 移動できる範囲のマスの一覧（spec.md 2.3）。
 * 移動力以内の距離にあり、盤面の中で、自分と他のキャラがいないマス。
 * 通り抜けの可否は考えない（spec.md 5章）。並びは上の行から、各行は左から。
 */
export function reachablePositions({ from, movement, occupied, board }: ReachableInput): Position[] {
  const isOccupied = (p: Position) => occupied.some((o) => o.x === p.x && o.y === p.y)
  const result: Position[] = []
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      const p = { x, y }
      if (x === from.x && y === from.y) continue
      if (isOccupied(p)) continue
      if (distance(from, p) > movement) continue
      result.push(p)
    }
  }
  return result
}
