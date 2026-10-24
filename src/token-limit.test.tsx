import { fireEvent, render, screen, within } from '@testing-library/react'
import App from './App.tsx'

// 同時数の上限を変えたとき、最初の準備と途中の追加の制限・残数表示・案内が揃うことを確かめる（#33）。
// 差し替えるのは上限の定数だけで、部品・状態・domain は実物を使う。番号の上限99は変えない。
vi.mock('./data/tokens.ts', () => ({ tokenLimits: { perSide: 4, maxNumber: 99 } }))

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }))
const field = (side: '味方' | '敵') => screen.getByRole('textbox', { name: `${side}の数` })
const area = () => screen.getByRole('group', { name: '追加する駒の数' })
const addField = (side: '味方' | '敵') => within(area()).getByRole('textbox', { name: `${side}の追加数` })

describe('同時数の上限を1か所で変える（#33）', () => {
  it('上限4にすると、最初の準備の案内・入力制約・±・用意の可否が4に揃う', () => {
    render(<App />)
    expect(field('味方')).toHaveAccessibleDescription('それぞれ0〜4体の整数を入力してください。')
    fireEvent.change(field('味方'), { target: { value: '5' } })
    expect(field('味方')).toHaveAttribute('aria-invalid', 'true')
    expect(field('味方')).toHaveAccessibleDescription('0〜4の整数で入力してください')
    expect(screen.getByRole('button', { name: '駒を用意する' })).toBeDisabled()
    fireEvent.change(field('味方'), { target: { value: '3' } })
    click('味方の数を増やす')
    expect(field('味方')).toHaveValue('4')
    expect(screen.getByRole('button', { name: '味方の数を増やす' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '駒を用意する' })).toBeEnabled()
  })

  it('上限4にすると、途中の追加の「あとN体」・入力制約・±・追加の可否も同じ上限で決まる', () => {
    render(<App />)
    fireEvent.change(field('味方'), { target: { value: '4' } })
    fireEvent.change(field('敵'), { target: { value: '1' } })
    click('駒を用意する')
    click('駒を増やす')
    expect(addField('味方')).toHaveAccessibleDescription('あと0体追加できます')
    expect(addField('敵')).toHaveAccessibleDescription('あと3体追加できます')
    expect(within(area()).getByRole('button', { name: '味方の追加数を増やす' })).toBeDisabled()
    fireEvent.change(addField('敵'), { target: { value: '4' } })
    expect(addField('敵')).toHaveAccessibleDescription('0〜3の整数で入力してください')
    expect(within(area()).getByRole('button', { name: '追加する' })).toBeDisabled()
    fireEvent.change(addField('敵'), { target: { value: '2' } })
    click('敵の追加数を増やす')
    expect(addField('敵')).toHaveValue('3')
    expect(within(area()).getByRole('button', { name: '敵の追加数を増やす' })).toBeDisabled()
    click('追加する')
    click('駒を増やす')
    expect(addField('敵')).toHaveAccessibleDescription('あと0体追加できます')
  })
})
