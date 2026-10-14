import type { Armor } from '../domain/types.ts'

// 移動力の数値（spec.md 3.2）。ゲーム側で仮の値のため、変えるときはここだけを直す。

/** 基本の移動力（マス） */
export const BASE_MOVEMENT = 5

/** 装備の重さによる移動力の補正 */
export const ARMOR_MOVEMENT_MODIFIER: Record<Armor, number> = {
  light: 0,
  medium: -1,
  heavy: -2,
}
