import type { Position } from './movement.ts'

/** 味方か敵か。画面ではコマの色で見分ける（spec.md 2.2）。 */
export type Side = 'ally' | 'enemy'

/** 駒の登録情報。未配置の position は null。番号は陣営ごとに1から始まる。 */
export interface Character {
  readonly id: string
  readonly name: string
  readonly side: Side
  readonly number: number
  readonly movement: number
  /** 利用者が手動で設定する状態。未配置から配置・確定後まで引き継ぐ。 */
  readonly fallen: boolean
  readonly position: Position | null
}
