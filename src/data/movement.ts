// 仮の移動力。基本値と装備補正はここでまとめて変更する（spec.md 3.2）。
export const movementRules = {
  base: 5,
  armorModifiers: {
    light: 0,
    medium: -1,
    heavy: -2,
  },
} as const

// #32以降に用意する駒の移動力。初期値と、準備中に±で設定できる範囲（spec.md 2.2・3.2）。
export const movementSetting = {
  initial: 5,
  min: 0,
  max: 9,
} as const
