import type { Position } from './movement.ts'

// テスト先行用の空の枠。振る舞いは次の実装コミットで加える。
export function formatPosition(_position: Position): string {
  return ''
}

export function parsePosition(_label: string): Position | null {
  return null
}
