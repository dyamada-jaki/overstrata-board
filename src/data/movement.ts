// 仮の移動力。基本値と装備補正はここでまとめて変更する（spec.md 3.2）。
export const movementRules = {
  base: 5,
  armorModifiers: {
    light: 0,
    medium: -1,
    heavy: -2,
  },
} as const
