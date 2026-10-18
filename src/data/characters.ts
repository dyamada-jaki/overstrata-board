import type { Character } from '../domain/character.ts'

// Sprint 1 のサンプル4体（spec.md 2.2）。position は0始まりの内部座標で、コメントは表の表示座標。
export const sampleCharacters: readonly Character[] = [
  { id: 'ally-1', name: '味方1', side: 'ally', armor: 'light', position: { x: 2, y: 7 } }, // (3, 8)
  { id: 'ally-2', name: '味方2', side: 'ally', armor: 'heavy', position: { x: 5, y: 8 } }, // (6, 9)
  { id: 'enemy-1', name: '敵1', side: 'enemy', armor: 'medium', position: { x: 3, y: 2 } }, // (4, 3)
  { id: 'enemy-2', name: '敵2', side: 'enemy', armor: 'light', position: { x: 6, y: 1 } }, // (7, 2)
]
