import { fireEvent, render, screen, within } from '@testing-library/react'
import { setCount } from './test/counts.ts'
// 上限の設定境界だけを差し替え、App・状態・domainは実物で接続する。
vi.mock('./data/pieces.ts', () => ({ pieceLimits: { perSide: 2, maxNumber: 99 } }))
import App from './App.tsx'

it('共通の同時上限を2へ変えると最初の準備・追加の案内/±/残数/生成がすべて揃う', () => {
  render(<App />)
  const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
  expect(screen.getByText('「−」「＋」で、それぞれ0〜2体を指定してください。')).toBeVisible()
  setCount('味方の数', '2')
  expect(screen.getByRole('button', { name: '味方の数を増やす' })).toBeDisabled()
  click('味方の数を増やす')
  expect(screen.getByRole('status', { name: '味方の数' })).toHaveTextContent(/^2$/)
  setCount('敵の数', '1')
  click('駒を用意する')
  expect(within(screen.getByRole('group', { name: '未配置の駒' })).getAllByRole('button')).toHaveLength(3)
  click('駒を増やす')
  expect(screen.getByText('味方：あと0体追加できます')).toBeVisible()
  expect(screen.getByText('敵：あと1体追加できます')).toBeVisible()
  expect(screen.getByRole('status', { name: '敵の追加数' })).toHaveAccessibleDescription('「−」「＋」で、0〜1体を指定してください。')
  expect(screen.getByRole('button', { name: '味方の追加数を増やす' })).toBeDisabled()
  expect(screen.getByRole('button', { name: '味方の追加数を減らす' })).toBeDisabled()
  setCount('敵の追加数', '1')
  expect(screen.getByRole('button', { name: '敵の追加数を増やす' })).toBeDisabled()
  click('追加する')
  expect(within(screen.getByRole('group', { name: '未配置の駒' })).getAllByRole('button')).toHaveLength(4)
  click('駒を増やす')
  expect(screen.getByText('敵：あと0体追加できます')).toBeVisible()
  expect(screen.getByRole('button', { name: '追加する' })).toBeDisabled()
})
