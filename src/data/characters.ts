import type { Character } from '../domain/character.ts'

/** spec.md 2.2の固定サンプル。位置だけ内部の0始まりへ変換する。 */
export const sampleCharacters: readonly Character[] = [
  { id: 'ally-1', name: '味方1', side: 'ally', armor: 'light', position: { x: 2, y: 7 } },
  { id: 'ally-2', name: '味方2', side: 'ally', armor: 'heavy', position: { x: 5, y: 8 } },
  { id: 'enemy-1', name: '敵1', side: 'enemy', armor: 'medium', position: { x: 3, y: 2 } },
  { id: 'enemy-2', name: '敵2', side: 'enemy', armor: 'light', position: { x: 6, y: 1 } },
]
