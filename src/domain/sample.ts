// 動作確認用の純粋関数。ゲームのルールとは関係ない。後で消してよい。

/** value を min 以上 max 以下に収める */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
