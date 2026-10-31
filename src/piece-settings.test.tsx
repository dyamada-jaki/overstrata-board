import { fireEvent, render, screen, within } from '@testing-library/react'
import App from './App.tsx'

const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const token = (name: string) => screen.getByRole('button', { name: new RegExp(`^未配置 ${name}（`) })
const popup = () => screen.getByRole('dialog', { name: /の設定$/ })
function prepare() {
  render(<App />)
  fireEvent.change(screen.getByRole('textbox', { name: '味方の数' }), { target: { value: '2' } })
  click('駒を用意する')
}

it('通常の選択・切替・解除は設定を開かず、設定ボタンは常設で未選択時だけ無効', () => {
  prepare()
  expect(screen.getByRole('button', { name: '設定' })).toBeDisabled()
  for (const name of ['味方1', '味方2', '味方2']) {
    fireEvent.click(token(name))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /の移動力$/ })).not.toBeInTheDocument()
  }
  expect(screen.getByRole('button', { name: '設定' })).toBeDisabled()
})

it('右クリックは対象を選択し、閉じても選択を保ち同じ対象で再度開ける', () => {
  prepare()
  fireEvent.click(token('味方1'))
  fireEvent.contextMenu(token('味方2'))
  expect(popup()).toHaveAccessibleName('味方2の設定')
  expect(within(popup()).getByText('味方・番号2')).toBeVisible()
  expect(token('味方2')).toHaveAttribute('aria-pressed', 'true')
  expect(token('味方1')).toHaveAttribute('aria-pressed', 'false')
  expect(screen.getByRole('button', { name: '設定を閉じる' })).toHaveFocus()
  click('設定を閉じる')
  expect(token('味方2')).toHaveFocus()
  expect(token('味方2')).toHaveAttribute('aria-pressed', 'true')
  fireEvent.contextMenu(token('味方2'))
  expect(token('味方2')).toHaveAttribute('aria-pressed', 'true')
  fireEvent(popup(), new Event('cancel', { cancelable: true }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(token('味方2')).toHaveFocus()
})

it('設定ボタンとキーボードから開き、Tabは設定内を循環する', () => {
  prepare()
  fireEvent.click(token('味方1'))
  const opener = screen.getByRole('button', { name: '設定' })
  opener.focus()
  fireEvent.click(opener)
  fireEvent.keyDown(screen.getByRole('button', { name: '設定を閉じる' }), { key: 'Tab', shiftKey: true })
  expect(screen.getByRole('button', { name: 'この駒を削除' })).toHaveFocus()
  fireEvent.keyDown(document.activeElement!, { key: 'Tab' })
  expect(screen.getByRole('button', { name: '設定を閉じる' })).toHaveFocus()
  click('設定を閉じる')
  expect(opener).toHaveFocus()
  fireEvent.keyDown(token('味方2'), { key: 'F10', shiftKey: true })
  expect(popup()).toHaveAccessibleName('味方2の設定')
})

it('削除の取消は同じ設定と変更済みの移動力・状態を保ち、実行だけが削除する', () => {
  prepare()
  fireEvent.contextMenu(token('味方1'))
  click('味方1の移動力を増やす')
  click('倒れた状態にする')
  click('この駒を削除')
  const confirmation = screen.getByRole('dialog', { name: '駒を削除' })
  expect(within(confirmation).getByRole('button', { name: 'キャンセル' })).toHaveFocus()
  click('キャンセル')
  expect(popup()).toBeVisible()
  expect(screen.getByRole('button', { name: 'この駒を削除' })).toHaveFocus()
  expect(token('味方1')).toHaveAccessibleName('未配置 味方1（味方・移動力6・倒れた状態）')
  expect(within(popup()).getByRole('status')).toHaveTextContent('6')
  click('この駒を削除')
  click('削除する')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /^未配置 味方1/ })).not.toBeInTheDocument()
  expect(token('味方2')).toBeVisible()
  expect(document.body).toHaveFocus()
})
