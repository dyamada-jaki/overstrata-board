export interface PopupAnchor { left: number; top: number; bottom: number }
export interface PopupSize { width: number; height: number }

// 実装前のテスト用の枠。DOMに依存せず、表示領域内の配置を求める。
export function getPopupPosition(_anchor: PopupAnchor, _popup: PopupSize, _viewport: PopupSize) {
  return { left: 0, top: 0 }
}
