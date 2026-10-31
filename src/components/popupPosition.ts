export interface Rect { readonly top: number; readonly left: number; readonly width: number; readonly height: number }
export interface Size { readonly width: number; readonly height: number }

/** 画面の端との余白と、駒との間隔（px）。 */
export const popupMargin = 8
export const popupGap = 4

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max))

/**
 * 駒の近くに置くポップアップの位置（画面座標）。駒の下に入るなら下、入らず上に入るなら上、
 * どちらにも入らなければ画面内へ寄せる。横は駒の中心に合わせ、左右の余白で画面内に収める（#45）。
 */
export function placePopup(anchor: Rect, popup: Size, viewport: Size): { top: number; left: number } {
  const below = anchor.top + anchor.height + popupGap
  const above = anchor.top - popupGap - popup.height
  const bottomLimit = viewport.height - popupMargin - popup.height
  const top = below <= bottomLimit ? below : above >= popupMargin ? above : clamp(below, popupMargin, bottomLimit)
  const left = clamp(anchor.left + anchor.width / 2 - popup.width / 2, popupMargin, viewport.width - popupMargin - popup.width)
  return { top, left }
}
