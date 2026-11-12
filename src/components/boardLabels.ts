/** 表示枠内で見えている列/行と、その番号・目盛の位置（#67）。 */
export interface AxisLabel {
  readonly number: number
  readonly start: number
  readonly end: number
  readonly anchor: number
  readonly center: number
}

/** 番号の箱の幅/高さ。Board.css の .board-label とそろえる（承認計画: 20px）。 */
const labelSize = 20

export function axisLabels(length: number, count: number, scale: number, offset: number): AxisLabel[] {
  // Board.css の盤面は padding/gap とも1px。線を除いた実際のマス区間に目盛を合わせる。
  const cell = (length - count - 1) / count
  const labels = Array.from({ length: count }, (_, index) => {
    const start = Math.max(0, offset + (1 + index * (cell + 1)) * scale)
    const end = Math.min(length, offset + (1 + index * (cell + 1) + cell) * scale)
    const anchor = (start + end) / 2
    return { number: index + 1, start, end, anchor, center: anchor }
  }).filter(({ start, end }) => end > start)

  // 左端から箱を離し、右端からも収める。目盛/引出線の先端(anchor)はずらさない。
  let previous = -labelSize / 2
  for (const label of labels) {
    label.center = Math.max(label.center, previous + labelSize)
    previous = label.center
  }
  let next = length + labelSize / 2
  for (let index = labels.length - 1; index >= 0; index -= 1) {
    const label = labels[index]!
    label.center = Math.min(label.center, next - labelSize)
    next = label.center
  }
  return labels
}
