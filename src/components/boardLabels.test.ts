import { axisLabels } from './boardLabels.ts'

// spec.md 2.4 / 承認計画: 見えているマスの番号を常に残す。文字の箱は20px、
// 端の断片では箱を帯に収め、目盛/引出線の行き先(anchor)はその断片の中央に残す。
describe('表示枠に残す座標番号と目盛', () => {
  it('1倍では全番号が、1pxの枠線/マス間を除いた各マスの中央に並ぶ', () => {
    // 幅101、2列: マスは [1,50] と [51,100]。
    expect(axisLabels(101, 2, 1, 0)).toEqual([
      { number: 1, start: 1, end: 50, anchor: 25.5, center: 25.5 },
      { number: 2, start: 51, end: 100, anchor: 75.5, center: 75.5 },
    ])
  })

  it('拡大・移動したマスの見えている区間に合わせる（枠線/間隔も拡大する）', () => {
    expect(axisLabels(101, 2, 2, -50)).toEqual([
      { number: 1, start: 0, end: 50, anchor: 25, center: 25 },
      { number: 2, start: 52, end: 101, anchor: 76.5, center: 76.5 },
    ])
  })

  it('4倍の左端・中央・右端では見える番号だけを1始まりで返す', () => {
    expect(axisLabels(311, 10, 4, 0).map((label) => label.number)).toEqual([1, 2, 3])
    expect(axisLabels(311, 10, 4, -466.5).map((label) => label.number)).toEqual([4, 5, 6, 7])
    expect(axisLabels(311, 10, 4, -933).map((label) => label.number)).toEqual([8, 9, 10])
  })

  it('端に接するだけのマスは表示しない。1pxだけでも見えていれば番号を残す', () => {
    expect(axisLabels(101, 2, 2, -100)).toEqual([
      { number: 2, start: 2, end: 100, anchor: 51, center: 51 },
    ])
    expect(axisLabels(101, 2, 2, -99)).toEqual([
      { number: 1, start: 0, end: 1, anchor: 0.5, center: 10 },
      { number: 2, start: 3, end: 101, anchor: 52, center: 52 },
    ])
    expect(axisLabels(101, 2, 2, -1).map((label) => label.number)).toEqual([1])
    expect(axisLabels(101, 2, 2, -2).map((label) => label.number)).toEqual([1, 2])
  })

  it('右の細い断片の番号も文字が切れず、引出線は断片内へ向く', () => {
    expect(axisLabels(101, 2, 2, -3)).toEqual([
      { number: 1, start: 0, end: 97, anchor: 48.5, center: 48.5 },
      { number: 2, start: 99, end: 101, anchor: 100, center: 91 },
    ])
  })

  it('中間倍率で左端の番号を寄せたとき、隣の箱も離し、対応先の目盛は変えない', () => {
    // 幅311・10列なら1倍のマス幅30、間隔1。1.1倍で左へ31px動かす。
    const labels = axisLabels(311, 10, 1.1, -31)
    expect(labels.map((label) => label.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(labels[0]!.end).toBeCloseTo(3.1)
    expect(labels[0]!.anchor).toBeCloseTo(1.55)
    expect(labels[0]!.center).toBe(10)
    expect(labels[1]!.anchor).toBeCloseTo(20.7)
    expect(labels[1]!.center).toBe(30)
    expect(labels[2]!.center).toBeCloseTo(54.8)
  })

  it('右端から寄せた箱も重ならず、帯内に収まる（左右対称）', () => {
    const labels = axisLabels(311, 10, 1.1, -0.1)
    expect(labels[9]!.center).toBe(301)
    expect(labels[8]!.center).toBe(281)
    for (let i = 0; i < labels.length; i += 1) {
      expect(labels[i]!.center).toBeGreaterThanOrEqual(10)
      expect(labels[i]!.center).toBeLessThanOrEqual(301)
      if (i > 0) expect(labels[i]!.center - labels[i - 1]!.center).toBeGreaterThanOrEqual(20)
    }
  })

  it('縦と横はそれぞれの長さ・マス数・表示位置を使う', () => {
    expect(axisLabels(101, 2, 2, -50).map((label) => label.anchor)).toEqual([25, 76.5])
    // 高さ81・2行ならマス幅39。[2,80]、[82,160] を上へ60移動。
    expect(axisLabels(81, 2, 2, -60)).toEqual([
      { number: 1, start: 0, end: 20, anchor: 10, center: 10 },
      { number: 2, start: 22, end: 81, anchor: 51.5, center: 51.5 },
    ])
  })
})
