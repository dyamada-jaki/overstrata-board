// #32 の駒の準備に使う値（spec.md 2.2・3.2）。
export const battleRules = {
  // 用意する駒の移動力。#32 では全駒この値で固定する。
  tokenMovement: 5,
  // 最初に用意できる1陣営あたりの最大数。
  maxTokensPerSide: 10,
} as const
