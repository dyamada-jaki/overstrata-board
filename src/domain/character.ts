import type { Armor, Position } from './movement.ts'

export interface Character {
  readonly id: string
  readonly name: string
  readonly side: 'ally' | 'enemy'
  readonly armor: Armor
  readonly position: Position
}

export type BoardSelection =
  | { readonly kind: 'none' }
  | { readonly kind: 'cell'; readonly position: Position }
  | { readonly kind: 'character'; readonly id: string }

export interface BattleState {
  readonly characters: readonly Character[]
  readonly selection: BoardSelection
}
