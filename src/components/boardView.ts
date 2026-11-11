/** 盤面の表示（倍率と表示位置）。px は表示枠の左上を原点にする（#63）。 */
export interface View { readonly scale: number; readonly x: number; readonly y: number }
export interface Frame { readonly width: number; readonly height: number }
export interface Point { readonly x: number; readonly y: number }

/** 拡大・縮小の範囲（spec.md 2.4、#63）。1倍＝盤面全体が表示枠に収まる大きさ。 */
export const zoomLimits = { min: 1, max: 4 }

export const initialView: View = { scale: 1, x: 0, y: 0 }

// -0 を 0 にそろえる（表示位置の比較と transform の文字列のため）。
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max)) + 0

/**
 * 倍率を1〜4倍に収め、表示位置を「盤面が表示枠からはみ出した分」だけ動ける範囲に収める。
 * 盤面の端より外へ余白を出さない。1倍では常に (0, 0)。
 */
export function clampView(view: View, frame: Frame): View {
  const scale = clamp(view.scale, zoomLimits.min, zoomLimits.max)
  return {
    scale,
    x: clamp(view.x, frame.width * (1 - scale), 0),
    y: clamp(view.y, frame.height * (1 - scale), 0),
  }
}

/** point（ホイールのカーソル・ピンチの中点）の下にある盤面上の点を動かさずに、factor 倍に拡大・縮小する。 */
export function zoomAt(view: View, factor: number, point: Point, frame: Frame): View {
  const scale = clamp(view.scale * factor, zoomLimits.min, zoomLimits.max)
  const ratio = scale / view.scale
  return clampView({
    scale,
    x: point.x - (point.x - view.x) * ratio,
    y: point.y - (point.y - view.y) * ratio,
  }, frame)
}

/** 表示位置を指・マウスの移動量だけ動かし、盤面の端で止める。 */
export function panBy(view: View, dx: number, dy: number, frame: Frame): View {
  return clampView({ ...view, x: view.x + dx, y: view.y + dy }, frame)
}
