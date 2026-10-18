import type { Armor, Position } from './movement.ts'

/** 味方か敵か。画面ではコマの色で見分ける（spec.md 2.2）。 */
export type Side = 'ally' | 'enemy'

/** 盤面に置くキャラ。position は0始まりの内部座標。 */
export interface Character {
  readonly id: string
  readonly name: string
  readonly side: Side
  readonly armor: Armor
  readonly position: Position
}
