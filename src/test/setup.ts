import '@testing-library/jest-dom/vitest'

// jsdom は dialog の top layer を実装しない。開閉の DOM 境界だけ補い、
// フォーカス制限・Esc・背後への入力遮断は本物の Chromium E2E で検証する。
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () { this.open = true }
  HTMLDialogElement.prototype.close = function () { this.open = false }
}

// jsdom には PointerEvent が無く、pointerType・座標が落ちる。長押しの判定に要る項目だけ補う。
// タッチの実際の入力は Chromium E2E（CDP のタッチ）と画面確認で検証する。
if (typeof window.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    readonly pointerId: number
    readonly pointerType: string
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 0
      this.pointerType = init.pointerType ?? ''
    }
  }
  window.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent
}
