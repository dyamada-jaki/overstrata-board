/** 盤面の表示だけの状態。駒の座標・選択とは共有しない。 */
export interface BoardView { readonly scale: number; readonly x: number; readonly y: number }
export interface ViewSize { readonly width: number; readonly height: number }
export interface ViewPoint { readonly x: number; readonly y: number }
export const wholeBoard: BoardView = { scale: 1, x: 0, y: 0 }

// テスト先行用の枠。表示計算は次の実装コミットで追加する。
export function constrainView(view: BoardView, size: ViewSize): BoardView {
  void view; void size
  return wholeBoard
}
export function zoomView(view: BoardView, scale: number, from: ViewPoint, to: ViewPoint, size: ViewSize): BoardView {
  void view; void scale; void from; void to; void size
  return wholeBoard
}
