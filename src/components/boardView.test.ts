import { axisLabels, clampView, initialView, labelMinSize, panBy, zoomAt, zoomLimits } from './boardView.ts'

// spec.md 2.4（#63）: 全体表示を1倍とし、1〜4倍。表示位置は盤面の端より外へ余白を出さない（計画で承認）。
const frame = { width: 300, height: 300 }

describe('clampView（倍率を1〜4倍、表示位置を盤面の端までに収める）', () => {
  it('範囲は1〜4倍', () => {
    expect(zoomLimits).toEqual({ min: 1, max: 4 })
    expect(initialView).toEqual({ scale: 1, x: 0, y: 0 })
  })

  it('1倍より小さくしない。1倍では表示位置は常に左上（0, 0）', () => {
    expect(clampView({ scale: 0.5, x: -10, y: 20 }, frame)).toEqual({ scale: 1, x: 0, y: 0 })
    expect(clampView({ scale: 1, x: -10, y: 20 }, frame)).toEqual({ scale: 1, x: 0, y: 0 })
  })

  it('4倍ちょうどは保ち、4倍を超えない', () => {
    expect(clampView({ scale: 4, x: -900, y: -900 }, frame)).toEqual({ scale: 4, x: -900, y: -900 })
    expect(clampView({ scale: 4.5, x: -100, y: -100 }, frame)).toEqual({ scale: 4, x: -100, y: -100 })
  })

  it('はみ出した分（枠×(倍率−1)）まで動かせ、その外は端に止める。縦横は枠の大きさで別々に決める', () => {
    const wide = { width: 300, height: 200 }
    expect(clampView({ scale: 2, x: -300, y: -200 }, wide)).toEqual({ scale: 2, x: -300, y: -200 })
    expect(clampView({ scale: 2, x: -301, y: -201 }, wide)).toEqual({ scale: 2, x: -300, y: -200 })
    expect(clampView({ scale: 2, x: 1, y: 1 }, wide)).toEqual({ scale: 2, x: 0, y: 0 })
    expect(clampView({ scale: 2, x: -150, y: -50 }, wide)).toEqual({ scale: 2, x: -150, y: -50 })
  })
})

describe('zoomAt（基準点の下の盤面上の点を動かさずに拡大・縮小する）', () => {
  it('中央を基準に2倍にすると、中央の点が枠の中央に残る', () => {
    expect(zoomAt(initialView, 2, { x: 150, y: 150 }, frame)).toEqual({ scale: 2, x: -150, y: -150 })
  })

  it('左上を基準にすると左上のまま、右下寄りなら右下寄りを残す', () => {
    expect(zoomAt(initialView, 2, { x: 0, y: 0 }, frame)).toEqual({ scale: 2, x: 0, y: 0 })
    expect(zoomAt(initialView, 2, { x: 300, y: 60 }, frame)).toEqual({ scale: 2, x: -300, y: -60 })
  })

  it('拡大中の基準点も保つ（2倍の (-150, -150) から点 (100, 200) で1.5倍）', () => {
    // 盤面上の点: x = (100 + 150) / 2 = 125、y = (200 + 150) / 2 = 175 → 3倍で 100 - 375 = -275、200 - 525 = -325
    expect(zoomAt({ scale: 2, x: -150, y: -150 }, 1.5, { x: 100, y: 200 }, frame)).toEqual({ scale: 3, x: -275, y: -325 })
  })

  it('4倍を超えて拡大せず、超えた分の倍率で基準点を計算しない', () => {
    expect(zoomAt(initialView, 10, { x: 150, y: 150 }, frame)).toEqual({ scale: 4, x: -450, y: -450 })
    expect(zoomAt({ scale: 4, x: -450, y: -450 }, 2, { x: 10, y: 10 }, frame)).toEqual({ scale: 4, x: -450, y: -450 })
  })

  it('1倍まで縮小すると全体表示の位置（0, 0）に戻り、1倍より小さくしない', () => {
    expect(zoomAt({ scale: 2, x: -150, y: -150 }, 0.25, { x: 100, y: 100 }, frame)).toEqual(initialView)
    expect(zoomAt(initialView, 0.5, { x: 100, y: 100 }, frame)).toEqual(initialView)
  })

  it('入力の表示を書き換えない', () => {
    const view = { scale: 2, x: -150, y: -150 }
    zoomAt(view, 1.5, { x: 100, y: 100 }, frame)
    expect(view).toEqual({ scale: 2, x: -150, y: -150 })
  })
})

describe('panBy（表示位置を動かし、盤面の端で止める）', () => {
  it('指・マウスの移動量だけ動かす', () => {
    expect(panBy({ scale: 2, x: -150, y: -150 }, 50, -20, frame)).toEqual({ scale: 2, x: -100, y: -170 })
  })

  it('端を越える移動は端で止める', () => {
    expect(panBy({ scale: 2, x: -150, y: -150 }, 400, -400, frame)).toEqual({ scale: 2, x: 0, y: -300 })
  })

  it('1倍では動かない', () => {
    expect(panBy(initialView, 40, 40, frame)).toEqual(initialView)
  })
})

// #67: 表示枠の上端・左端に残す番号の位置（spec.md 2.4「拡大・移動中の座標ラベル」）。
// マスの並びは盤面の CSS と同じく、内側に 1px の余白、マス同士の間に 1px。長さ 111px・10マスなら1倍のマスは 10px で、
// マス i は 1倍で [1 + 11i, 11 + 11i]、4倍で [4 + 44i, 44 + 44i] に表示位置（offset）を足した範囲になる。期待値はこの並びから手で計算した。
describe('axisLabels（見えている列・行の番号と、それを置く範囲）', () => {
  const list = (labels: ReturnType<typeof axisLabels>) => labels.map(({ number, start, size }) => [number, start, size])

  it('切れたマスの番号を出す最小の見えている幅は 16px', () => {
    expect(labelMinSize).toBe(16)
  })

  it('1倍では1〜10をすべて、それぞれのマスの範囲に置く', () => {
    expect(list(axisLabels(10, 1, 0, 111))).toEqual(
      Array.from({ length: 10 }, (_, i) => [i + 1, 1 + 11 * i, 10]))
  })

  it('全体が見えているマスは、16px より狭くても番号を出す（1倍のマス 5px）', () => {
    expect(list(axisLabels(10, 1, 0, 61))).toEqual(
      Array.from({ length: 10 }, (_, i) => [i + 1, 1 + 6 * i, 5]))
  })

  it('4倍・左上: 見えている 1〜3 だけ。枠の端で切れた3は、見えている部分（92〜111）だけを範囲にする', () => {
    expect(list(axisLabels(10, 4, 0, 111))).toEqual([[1, 4, 40], [2, 48, 40], [3, 92, 19]])
  })

  it('表示位置の移動に追従する。両端で 16px 未満しか見えない1と4は出さない', () => {
    expect(list(axisLabels(10, 4, -30, 111))).toEqual([[2, 18, 40], [3, 62, 40]])
  })

  it('左端で切れたマスは、見えている部分（枠の 0 から）だけを範囲にする', () => {
    expect(list(axisLabels(10, 4, -55, 111))).toEqual([[2, 0, 33], [3, 37, 40], [4, 81, 30]])
  })

  it('見えている部分がちょうど 16px なら出し、15px なら出さない（左端・右端）', () => {
    expect(list(axisLabels(10, 4, -28, 111))).toEqual([[1, 0, 16], [2, 20, 40], [3, 64, 40]])
    expect(list(axisLabels(10, 4, -29, 111))).toEqual([[2, 19, 40], [3, 63, 40]])
    expect(list(axisLabels(10, 4, -41, 111))).toEqual([[2, 7, 40], [3, 51, 40], [4, 95, 16]])
    expect(list(axisLabels(10, 4, -40, 111))).toEqual([[2, 8, 40], [3, 52, 40]])
  })

  it('4倍・右下の端: 最後の 8〜10 が見え、10 の右に盤面の余白（4倍の 4px）が残る', () => {
    // 右下の端は offset = 111 × (1 − 4) = −333。マス 8〜10 は [−21, 19]（見えるのは 19px）・[23, 63]・[67, 107]。
    expect(list(axisLabels(10, 4, -333, 111))).toEqual([[8, 0, 19], [9, 23, 40], [10, 67, 40]])
  })

  it('列数が違っても同じ並びで計算する（3マス・長さ 34px → 1倍のマス 10px）', () => {
    expect(list(axisLabels(3, 1, 0, 34))).toEqual([[1, 1, 10], [2, 12, 10], [3, 23, 10]])
  })
})
