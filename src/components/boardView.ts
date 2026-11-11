/** 盤面の表示だけの状態。駒の座標・選択とは共有しない。 */
export interface BoardView { readonly scale: number; readonly x: number; readonly y: number }
export interface ViewSize { readonly width: number; readonly height: number }
export interface ViewPoint { readonly x: number; readonly y: number }
export const wholeBoard: BoardView = { scale: 1, x: 0, y: 0 }

const limitScale = (scale: number) => Math.min(4, Math.max(1, scale))

/** 表示枠の内側に盤面の外側の空白を入れない。幅の変更にも同じ制限を使う。 */
export function constrainView(view: BoardView, size: ViewSize): BoardView {
  const scale = limitScale(view.scale)
  return {
    scale,
    x: Math.min(0, Math.max(size.width * (1 - scale), view.x)),
    y: Math.min(0, Math.max(size.height * (1 - scale), view.y)),
  }
}
/** from の下にある盤面上の点を to の下へ移す。ピンチでは中点の移動も反映する。 */
export function zoomView(view: BoardView, scale: number, from: ViewPoint, to: ViewPoint, size: ViewSize): BoardView {
  const nextScale = limitScale(scale)
  const ratio = nextScale / view.scale
  return constrainView({ scale: nextScale, x: to.x - (from.x - view.x) * ratio, y: to.y - (from.y - view.y) * ratio }, size)
}
