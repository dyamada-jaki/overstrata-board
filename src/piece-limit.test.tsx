import { fireEvent, render, screen, within } from '@testing-library/react'
// 上限の設定境界だけを差し替え、App・状態・domainは実物で接続する。
vi.mock('./data/pieces.ts', () => ({ pieceLimits: { perSide: 2, maxNumber: 99 } }))
import App from './App.tsx'
import { countText, setCount } from './test/counts.ts'

it('共通の同時上限を2へ変えると最初の準備・追加の±/案内/残数/生成がすべて揃う', () => {
  render(<App />)
  const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
  const button = (name: string) => screen.getByRole('button', { name })
  expect(screen.getByText('それぞれ0〜2体まで「−」「＋」で指定します。')).toBeVisible()
  setCount('味方の数', 2)
  expect(button('味方の数を増やす')).toBeDisabled()
  click('味方の数を増やす')
  expect(countText('味方の数')).toBe('2')
  setCount('敵の数', 1)
  click('駒を用意する')
  expect(within(screen.getByRole('group', { name: '未配置の駒' })).getAllByRole('button')).toHaveLength(3)
  click('駒を増やす')
  expect(screen.getByText('味方：あと0体追加できます')).toBeVisible()
  expect(screen.getByText('敵：あと1体追加できます')).toBeVisible()
  expect(screen.getByRole('group', { name: '敵の追加数' })).toHaveAccessibleDescription('0〜1体まで指定できます。')
  // 追加できない陣営は「−」「＋」の両方を押せない。
  expect(button('味方の追加数を減らす')).toBeDisabled()
  expect(button('味方の追加数を増やす')).toBeDisabled()
  setCount('敵の追加数', 1)
  expect(button('敵の追加数を増やす')).toBeDisabled()
  click('敵の追加数を増やす')
  expect(countText('敵の追加数')).toBe('1')
  click('追加する')
  expect(within(screen.getByRole('group', { name: '未配置の駒' })).getAllByRole('button')).toHaveLength(4)
  click('駒を増やす')
  expect(screen.getByText('敵：あと0体追加できます')).toBeVisible()
  expect(button('敵の追加数を増やす')).toBeDisabled()
  expect(button('追加する')).toBeDisabled()
})
