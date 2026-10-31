export interface PopupAnchor { left: number; top: number; bottom: number }
export interface PopupSize { width: number; height: number }

/** 下→上の順で試し、どちらも入らなければ画面内へ寄せる。内容の高さはCSSで制限する。 */
export function getPopupPosition(anchor: PopupAnchor, popup: PopupSize, viewport: PopupSize) {
  const gap = 8
  const width = Math.min(popup.width, viewport.width - gap * 2)
  const height = Math.min(popup.height, viewport.height - gap * 2)
  const left = Math.max(gap, Math.min(anchor.left, viewport.width - width - gap))
  const below = anchor.bottom + gap
  const above = anchor.top - height - gap
  const top = below >= gap && below + height <= viewport.height - gap ? below
    : above >= gap && above + height <= viewport.height - gap ? above
      : Math.max(gap, Math.min(below, viewport.height - height - gap))
  return { left, top }
}
