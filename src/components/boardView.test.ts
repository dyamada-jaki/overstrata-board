import { clampView, initialView, panBy, zoomAt, zoomLimits } from './boardView.ts'

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
