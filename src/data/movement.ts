// 仮の移動力。基本値と装備補正はここでまとめて変更する（spec.md 3.2）。
export const movementRules = {
  base: 5,
  armorModifiers: {
    light: 0,
    medium: -1,
    heavy: -2,
  },
} as const

// #32以降の準備用。装備の補正は使わず、駒ごとの値を設定する（spec.md 2.2）。
export const preparationMovement = { initial: 5, min: 0, max: 9 } as const
