import { placePopup } from './popupPosition.ts'

// 375×667 の画面に、幅240・高さ180のポップアップを置く。余白8px・駒との間4px（#45 の計画の5章）。
const viewport = { width: 375, height: 667 }
const popup = { width: 240, height: 180 }
const piece = (left: number, top: number) => ({ left, top, width: 32, height: 32 })

describe('placePopup（駒の近くに置き、画面内に収める）', () => {
  it('下に入るなら駒の下に、中心を駒に合わせて置く', () => {
    expect(placePopup(piece(170, 100), popup, viewport)).toEqual({ top: 136, left: 66 })
  })

  it('下に入る境界：下端の余白8pxちょうどまでは下に置く', () => {
    // 駒の下端475 + 4 + 180 = 659 = 667 - 8
    expect(placePopup(piece(170, 443), popup, viewport).top).toBe(479)
    expect(placePopup(piece(170, 444), popup, viewport).top).toBe(444 - 4 - 180)
  })

  it('下に入らず上に入るなら駒の上に置く。上端の余白8pxちょうどまでは上', () => {
    expect(placePopup(piece(170, 600), popup, viewport)).toEqual({ top: 416, left: 66 })
    expect(placePopup(piece(170, 512), { width: 240, height: 500 }, viewport).top).toBe(8)
  })

  it('上下どちらにも入らなければ、画面内（上下8px）に収める', () => {
    // 上は 511 - 4 - 500 = 7 で余白不足。下側の位置を 667 - 8 - 500 = 159 まで引き上げる。
    expect(placePopup(piece(170, 511), { width: 240, height: 500 }, viewport).top).toBe(159)
    expect(placePopup(piece(170, 300), { width: 240, height: 700 }, viewport).top).toBe(8)
  })

  it('左端・右端の駒では左右8pxの余白で画面内に収める', () => {
    expect(placePopup(piece(0, 100), popup, viewport).left).toBe(8)
    expect(placePopup(piece(343, 100), popup, viewport).left).toBe(375 - 8 - 240)
    expect(placePopup(piece(112, 100), popup, viewport).left).toBe(8)
    expect(placePopup(piece(113, 100), popup, viewport).left).toBe(9)
  })

  it('画面より広いポップアップは左の余白に合わせる', () => {
    expect(placePopup(piece(170, 100), { width: 400, height: 180 }, viewport).left).toBe(8)
  })
})
