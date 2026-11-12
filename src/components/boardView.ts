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

/** 座標の番号を出す、切れたマスの見えている部分の最小の幅・高さ（px）。「10」（約15px）が切れずに入る大きさ（#67）。 */
export const labelMinSize = 16

/** 表示枠に見えている列（行）の番号と、その番号を置く範囲（表示枠の左端・上端からの px）（#67）。 */
export interface AxisLabel { readonly number: number; readonly start: number; readonly size: number }

/**
 * 表示枠の上端に残す列の番号（行の番号は縦について同じ計算）の位置（spec.md 2.4、#67）。
 * マスの並びは盤面の CSS と同じく、内側に 1px の余白、マス同士の間に 1px。それを scale 倍して offset（View の x・y）だけずらす。
 * 番号はマスのうち表示枠に見えている部分に置く（全体が見えていればマスの中心、切れていれば見えている部分の中央）。
 * 切れたマスは、見えている部分が labelMinSize 未満なら番号を出さない（「10」の一部が「1」に見えるなどの誤読を防ぐ）。
 * 全体が見えているマスは、狭くても出す。
 */
export function axisLabels(count: number, scale: number, offset: number, length: number): AxisLabel[] {
  const cell = (length - (count + 1)) / count
  const labels: AxisLabel[] = []
  for (let index = 0; index < count; index += 1) {
    const start = offset + scale * (1 + index * (cell + 1))
    const end = start + scale * cell
    const from = Math.max(start, 0)
    const size = Math.min(end, length) - from
    const whole = start >= 0 && end <= length
    if (size > 0 && (whole || size >= labelMinSize)) labels.push({ number: index + 1, start: from, size })
  }
  return labels
}
