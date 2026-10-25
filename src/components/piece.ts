import type { Character, Side } from '../domain/character.ts'

const sideLabels: Record<Side, string> = { ally: '味方', enemy: '敵' }

/** 盤面・未配置一覧・操作パネルで共通の駒の丸。倒れた状態はフィルターで暗くする（#34）。 */
export const tokenClass = (character: Character) =>
  `board-token board-token-${character.side}${character.downed ? ' board-token-downed' : ''}`
/** アクセシブル名の括弧内。倒れた状態だけを書き足す。 */
export const pieceDetails = (character: Character) =>
  `${sideLabels[character.side]}・移動力${character.movement}${character.downed ? '・倒れた状態' : ''}`
