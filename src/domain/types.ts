/** マス座標。左上が (0,0)。x は右へ、y は下へ増える */
export interface Position {
  x: number
  y: number
}

/** 装備の重さ（軽装 / 中装 / 重装） */
export type Armor = 'light' | 'medium' | 'heavy'

/** 盤面の大きさ（横 width マス × 縦 height マス） */
export interface BoardSize {
  width: number
  height: number
}
