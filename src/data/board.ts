import type { BoardSize } from '../domain/movement.ts'

// 盤面の横・縦のマス数。表示と盤面を使う計算はここを参照する（spec.md 2.1）。
export const boardSize: BoardSize = { width: 10, height: 10 }
