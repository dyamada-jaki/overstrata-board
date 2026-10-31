import { fireEvent, screen } from '@testing-library/react'

export function openSettings() {
  if (!screen.queryByRole('dialog', { name: /の設定$/ })) {
    fireEvent.click(screen.getByRole('button', { name: '設定' }))
  }
}

export function closeSettings() {
  const close = screen.queryByRole('button', { name: '設定を閉じる' })
  if (close) fireEvent.click(close)
}

/** 旧UIのルール検証で使う、選択→明示的に設定を開く操作。通常タップは別の結合テストで検証する。 */
export function selectAndOpen(target: HTMLElement) {
  closeSettings()
  fireEvent.click(target)
  if (target.getAttribute('aria-pressed') === 'true' && target.querySelector('.board-token')) openSettings()
}

/** modalの外の操作へ移るときは先に×を押す。ゲーム処理は実物を通す。 */
export function clickWithSettings(name: string | RegExp) {
  const target = screen.getByRole('button', { name })
  const popup = screen.queryByRole('dialog', { name: /の設定$/ })
  const confirmation = screen.queryByRole('dialog', { name: /^(駒を削除|準備をやり直す|新しい戦闘を始める)$/ })
  if (popup && !popup.contains(target) && !confirmation) closeSettings()
  fireEvent.click(target)
}
