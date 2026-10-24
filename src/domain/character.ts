import type { Position } from './movement.ts'

/** 味方か敵か。画面ではコマの色で見分ける（spec.md 2.2）。 */
export type Side = 'ally' | 'enemy'

/** 駒の登録情報。未配置の position は null。番号は陣営ごとに1から発行順に付け、再利用しない（#33）。 */
export interface Character {
  readonly id: string
  readonly name: string
  readonly side: Side
  readonly number: number
  readonly movement: number
  readonly position: Position | null
  /** 「確定」または「追加分を確定」を済ませたか。未確定の駒だけ移動力を変更できる（#37・#33）。 */
  readonly confirmed: boolean
}
