import { constrainView, wholeBoard, zoomView } from './boardView.ts'

const size = { width: 300, height: 200 }
describe('盤面の表示計算（ゲーム座標とは独立）', () => {
  it('カーソル／二本指の中点の下の盤面を保って拡大する', () => {
    expect(zoomView(wholeBoard, 2, { x: 150, y: 100 }, { x: 150, y: 100 }, size))
      .toEqual({ scale: 2, x: -150, y: -100 })
    expect(zoomView({ scale: 2, x: -150, y: -100 }, 3, { x: 150, y: 100 }, { x: 180, y: 120 }, size))
      .toEqual({ scale: 3, x: -270, y: -180 })
  })
  it('1〜4倍、縦横それぞれの端で空白が入らない範囲に収める', () => {
    expect(constrainView({ scale: 2, x: -350, y: 20 }, size)).toEqual({ scale: 2, x: -300, y: 0 })
    expect(constrainView({ scale: 2, x: 30, y: -250 }, size)).toEqual({ scale: 2, x: 0, y: -200 })
    expect(constrainView({ scale: 0.5, x: -20, y: -20 }, size)).toEqual(wholeBoard)
    expect(constrainView({ scale: 5, x: -1000, y: -1000 }, size)).toEqual({ scale: 4, x: -900, y: -600 })
    expect(constrainView({ scale: 2, x: -300, y: -200 }, { width: 100, height: 50 }))
      .toEqual({ scale: 2, x: -100, y: -50 })
  })
  it('上限を超える拡大でも4倍の比率で中心を保ち、縮小し切ると全体へ戻す。入力は変更しない', () => {
    const view = Object.freeze({ scale: 2, x: -150, y: -100 })
    const point = Object.freeze({ x: 150, y: 100 })
    const bounds = Object.freeze(size)
    expect(zoomView(view, 8, point, point, bounds)).toEqual({ scale: 4, x: -450, y: -300 })
    expect(zoomView(view, 0, point, point, bounds)).toEqual(wholeBoard)
    expect(view).toEqual({ scale: 2, x: -150, y: -100 })
  })
})
