export interface Rect { readonly top: number; readonly left: number; readonly width: number; readonly height: number }
export interface Size { readonly width: number; readonly height: number }

/** 駒の近くに置くポップアップの位置（画面座標）。#45 の計画の5章。 */
export function placePopup(anchor: Rect, popup: Size, viewport: Size): { top: number; left: number } {
  void [anchor, popup, viewport] // 未実装の枠（#45 のテスト先行）
  return { top: 0, left: 0 }
}
