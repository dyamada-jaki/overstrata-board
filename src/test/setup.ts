import '@testing-library/jest-dom/vitest'

// jsdom は dialog の top layer を実装しない。開閉の DOM 境界だけ補い、
// フォーカス制限・Esc・背後への入力遮断は本物の Chromium E2E で検証する。
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () { this.open = true }
  HTMLDialogElement.prototype.close = function () { this.open = false }
}
