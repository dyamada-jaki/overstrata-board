import { fireEvent, screen } from '@testing-library/react'

/** 利用者と同じ±操作で数を指定する。境界を越える要求はテスト側の誤りとして止める。 */
export function setCount(name: string, value: string) {
  const current = Number(screen.getByRole('status', { name }).textContent)
  const target = Number(value)
  const button = screen.getByRole('button', { name: `${name}を${target < current ? '減らす' : '増やす'}` })
  for (let i = 0; i < Math.abs(target - current); i += 1) {
    expect(button).toBeEnabled()
    fireEvent.click(button)
  }
}
