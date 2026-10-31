import { getPopupPosition } from './popupPosition.ts'

const popup = { width: 288, height: 250 }
const viewport = { width: 375, height: 667 }

it.each([
  [{ left: 30, top: 100, bottom: 140 }, { left: 30, top: 148 }],
  // 下端が余白8pxにちょうど収まる／1px足りず上側へ。
  [{ left: 30, top: 361, bottom: 401 }, { left: 30, top: 409 }],
  [{ left: 30, top: 362, bottom: 402 }, { left: 30, top: 104 }],
  [{ left: 30, top: 600, bottom: 640 }, { left: 30, top: 342 }],
  [{ left: -10, top: 100, bottom: 140 }, { left: 8, top: 148 }],
  [{ left: 350, top: 100, bottom: 140 }, { left: 79, top: 148 }],
  [{ left: 8, top: 100, bottom: 140 }, { left: 8, top: 148 }],
  [{ left: 79, top: 100, bottom: 140 }, { left: 79, top: 148 }],
  [{ left: 30, top: -400, bottom: -360 }, { left: 30, top: 8 }],
  [{ left: 30, top: 1000, bottom: 1040 }, { left: 30, top: 409 }],
  [{ left: 30, top: 675, bottom: 715 }, { left: 30, top: 409 }],
])('画面端と上下の空きに従って配置する: %j', (anchor, expected) => {
  expect(getPopupPosition(anchor, popup, viewport)).toEqual(expected)
})

it('上下とも空きが足りない場合も画面内へ収める', () => {
  expect(getPopupPosition({ left: 30, top: 100, bottom: 140 }, popup, { width: 375, height: 300 }))
    .toEqual({ left: 30, top: 42 })
})

it('上側の余白が8pxちょうどなら上に表示する', () => {
  expect(getPopupPosition({ left: 30, top: 266, bottom: 306 }, popup, { width: 375, height: 400 }))
    .toEqual({ left: 30, top: 8 })
})

it('画面より高い内容は余白を残した内部スクロール領域の位置に置く', () => {
  expect(getPopupPosition({ left: 0, top: 10, bottom: 50 }, { width: 288, height: 900 }, viewport))
    .toEqual({ left: 8, top: 8 })
})
