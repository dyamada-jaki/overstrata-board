import type { BoardSize } from '../domain/movement.ts'

// 表示と盤面を使う計算には、このサイズを渡す（spec.md 2.1）。
export const boardSize: BoardSize = { width: 10, height: 10 }
