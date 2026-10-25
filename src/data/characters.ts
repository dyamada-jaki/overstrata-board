import type { Character } from '../domain/character.ts'
import { getMovement } from '../domain/movement.ts'

// #9の過去サンプル。起動時には使わず、既存の距離・移動テストの資料として保持する。
// 装備からの変換はこの過去サンプルだけで、#32の駒は準備時に全駒5を設定する。
export const sampleCharacters = [
  { id: 'ally-1', name: '味方1', side: 'ally', number: 1, movement: getMovement('light'), position: { x: 2, y: 7 }, downed: false },
  { id: 'ally-2', name: '味方2', side: 'ally', number: 2, movement: getMovement('heavy'), position: { x: 5, y: 8 }, downed: false },
  { id: 'enemy-1', name: '敵1', side: 'enemy', number: 1, movement: getMovement('medium'), position: { x: 3, y: 2 }, downed: false },
  { id: 'enemy-2', name: '敵2', side: 'enemy', number: 2, movement: getMovement('light'), position: { x: 6, y: 1 }, downed: false },
] as const satisfies readonly Character[]
