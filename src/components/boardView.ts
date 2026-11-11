/** 盤面の表示（倍率と表示位置）。px は表示枠の左上を原点にする。 */
export interface View { readonly scale: number; readonly x: number; readonly y: number }
export interface Frame { readonly width: number; readonly height: number }
export interface Point { readonly x: number; readonly y: number }

/** 拡大・縮小の範囲（spec.md 2.4、#63）。1倍＝盤面全体が表示枠に収まる大きさ。 */
export const zoomLimits = { min: 1, max: 4 }

export const initialView: View = { scale: 1, x: 0, y: 0 }

export function clampView(view: View, frame: Frame): View {
  void frame
  return view
}

export function zoomAt(view: View, factor: number, point: Point, frame: Frame): View {
  void [factor, point, frame]
  return view
}

export function panBy(view: View, dx: number, dy: number, frame: Frame): View {
  void [dx, dy, frame]
  return view
}
