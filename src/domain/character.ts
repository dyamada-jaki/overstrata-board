import type { Position } from './movement.ts'

/** 味方か敵か。画面ではコマの色で見分ける（spec.md 2.2）。 */
export type Side = 'ally' | 'enemy'

/**
 * 盤面に置くキャラ（駒）。同じ陣営の駒は number（1始まり）で見分ける。
 * position は0始まりの内部座標で、未配置なら null。
 */
export interface Character {
  readonly id: string
  readonly name: string
  readonly side: Side
  readonly number: number
  readonly movement: number
  readonly position: Position | null
}
