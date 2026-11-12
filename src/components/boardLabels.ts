/** 表示枠内で見えている列/行と、その番号・目盛の位置（#67）。 */
export interface AxisLabel {
  readonly number: number
  readonly start: number
  readonly end: number
  readonly anchor: number
  readonly center: number
}

export function axisLabels(_length: number, _count: number, _scale: number, _offset: number): AxisLabel[] {
  return []
}
