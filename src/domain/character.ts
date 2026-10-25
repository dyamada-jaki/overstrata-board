import type { Position } from './movement.ts'

/** 味方か敵か。画面ではコマの色で見分ける（spec.md 2.2）。 */
export type Side = 'ally' | 'enemy'

/** 駒の登録情報。未配置の position は null。番号は陣営ごとに1から始まる。downed は利用者が切り替える倒れた状態（#34）。 */
export interface Character {
  readonly id: string
  readonly name: string
  readonly side: Side
  readonly number: number
  readonly movement: number
  readonly position: Position | null
  readonly downed: boolean
}
