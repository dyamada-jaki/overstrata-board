import { fireEvent, render, screen, within } from '@testing-library/react'
import App from './App.tsx'

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }))
const cell = (x: number, y: number) => screen.getByRole('button', { name: new RegExp(`^マス \\(${x}, ${y}\\)`) })
const token = (name: string) => screen.getByRole('button', { name: new RegExp(`(?:^未配置 | )${name}（`) })
const pressed = () => screen.queryAllByRole('button', { pressed: true })
const range = () => screen.queryAllByRole('button', { name: / 移動範囲$/ }).map((el) => el.getAttribute('aria-label'))
const occupants = () => screen.queryAllByRole('button', { name: /^マス .*（/ }).map((el) => el.getAttribute('aria-label'))
const unplacedNames = () => screen.queryAllByRole('button', { name: /^未配置 / }).map((el) => el.getAttribute('aria-label'))
const setting = (name: string) => screen.getByRole('group', { name: `${name}の移動力` })
function prepare(ally: string, enemy: string) {
  fireEvent.change(screen.getByRole('textbox', { name: '味方の数' }), { target: { value: ally } })
  fireEvent.change(screen.getByRole('textbox', { name: '敵の数' }), { target: { value: enemy } })
  click('駒を用意する')
}
function place(name: string, x: number, y: number) {
  fireEvent.click(token(name))
  fireEvent.click(cell(x, y))
}
function remove(name: string) {
  fireEvent.click(token(name))
  click('この駒を削除')
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '削除する' }))
}

describe('駒の削除（#33）', () => {
  it('駒を選ぶまで「この駒を削除」は出ず、マスの選択でも出ない', () => {
    render(<App />)
    prepare('1', '1')
    expect(screen.queryByRole('button', { name: 'この駒を削除' })).not.toBeInTheDocument()
    fireEvent.click(cell(5, 5))
    expect(screen.queryByRole('button', { name: 'この駒を削除' })).not.toBeInTheDocument()
    fireEvent.click(token('敵1'))
    expect(screen.getByRole('button', { name: 'この駒を削除' })).toBeVisible()
  })

  it.each([
    ['準備中', '未配置一覧'], ['準備中', '盤面'], ['戦闘中', '盤面'], ['戦闘中', '未配置一覧'],
  ])('%sに%sから選んだ駒を、対象名の確認のあと1体だけ削除し、選択と範囲を解除する', (phase, from) => {
    render(<App />)
    prepare('1', '3')
    place('味方1', 1, 1)
    place('敵1', 2, 2)
    if (from === '盤面' || phase === '戦闘中') place('敵3', 3, 3)
    if (phase === '戦闘中') {
      place('敵2', 4, 4)
      click('確定')
      if (from === '未配置一覧') {
        click('駒を増やす')
        fireEvent.change(screen.getByRole('textbox', { name: '敵の追加数' }), { target: { value: '1' } })
        click('追加する')
      }
    }
    const target = phase === '戦闘中' && from === '未配置一覧' ? '敵4' : '敵3'
    fireEvent.click(token(target))
    expect(pressed()).toHaveLength(1)
    const before = { occupied: occupants(), unplaced: unplacedNames() }
    click('この駒を削除')
    const dialog = screen.getByRole('dialog', { name: `${target}を削除しますか？` })
    expect(dialog).toHaveAccessibleDescription(`${target}を盤面と一覧から取り除きます。`)
    expect(within(dialog).getByRole('button', { name: 'キャンセル' })).toHaveFocus()
    fireEvent.click(within(dialog).getByRole('button', { name: '削除する' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: new RegExp(`(?:^未配置 | )${target}（`) })).not.toBeInTheDocument()
    expect(occupants()).toEqual(before.occupied.filter((label) => !label!.includes(`${target}（`)))
    expect(unplacedNames()).toEqual(before.unplaced.filter((label) => !label!.includes(`${target}（`)))
    expect(pressed()).toEqual([])
    expect(range()).toEqual([])
    expect(screen.queryByRole('button', { name: 'この駒を削除' })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: phase === '準備中' ? '配置の準備' : '戦闘中' })).toBeVisible()
  })

  it.each(['キャンセル', 'Esc'])('確認を%sで取り消すと、対象の駒・選択・範囲・移動力をそのまま保つ', (how) => {
    render(<App />)
    prepare('0', '2')
    place('敵1', 3, 3)
    place('敵2', 5, 5)
    fireEvent.click(cell(3, 3))
    fireEvent.click(within(setting('敵1')).getByRole('button', { name: '敵1の移動力を減らす' }))
    const before = { occupied: occupants(), selected: pressed(), range: range() }
    expect(before.range.length).toBeGreaterThan(0)
    const opener = screen.getByRole('button', { name: 'この駒を削除' })
    opener.focus()
    fireEvent.click(opener)
    const dialog = screen.getByRole('dialog', { name: '敵1を削除しますか？' })
    if (how === 'Esc') fireEvent(dialog, new Event('cancel', { cancelable: true }))
    else fireEvent.click(within(dialog).getByRole('button', { name: 'キャンセル' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(occupants()).toEqual(before.occupied)
    expect(pressed()).toEqual(before.selected)
    expect(range()).toEqual(before.range)
    expect(cell(3, 3)).toHaveAccessibleName(/^マス \(3, 3\) 敵1（敵・移動力4）/)
    expect(screen.getByRole('button', { name: 'この駒を削除' })).toHaveFocus()
  })

  it('削除しても他の駒の配置と移動力は変わらない', () => {
    render(<App />)
    prepare('1', '2')
    place('味方1', 1, 1)
    fireEvent.click(cell(1, 1))
    fireEvent.click(within(setting('味方1')).getByRole('button', { name: '味方1の移動力を増やす' }))
    fireEvent.click(cell(1, 1))
    place('敵1', 2, 2)
    remove('敵1')
    expect(occupants()).toEqual(['マス (1, 1) 味方1（味方・移動力6）'])
    expect(unplacedNames()).toEqual(['未配置 敵2（敵・移動力5）'])
  })

  it('準備中に全駒を削除しても「駒を配置」のまま空の盤面を表示し、「確定」は押せない。続けて追加すると続きの番号', () => {
    render(<App />)
    prepare('1', '1')
    place('味方1', 1, 1)
    remove('味方1')
    expect(screen.getByRole('button', { name: '確定' })).toBeDisabled()
    remove('敵1')
    expect(occupants()).toEqual([])
    expect(unplacedNames()).toEqual([])
    expect(screen.getAllByRole('button', { name: /^マス / })).toHaveLength(100)
    expect(screen.getByRole('region', { name: '配置の準備' })).toBeVisible()
    expect(screen.getByRole('heading', { name: '駒を配置' })).toBeVisible()
    expect(screen.getByRole('button', { name: '確定' })).toBeDisabled()
    expect(screen.queryByRole('textbox', { name: '味方の数' })).not.toBeInTheDocument()
    click('駒を増やす')
    fireEvent.change(screen.getByRole('textbox', { name: '味方の追加数' }), { target: { value: '1' } })
    click('追加する')
    expect(unplacedNames()).toEqual(['未配置 味方2（味方・移動力5）'])
    expect(screen.getByRole('button', { name: '確定' })).toBeDisabled()
    place('味方2', 4, 4)
    expect(screen.getByRole('button', { name: '確定' })).toBeEnabled()
  })

  it('戦闘中に全駒を削除しても「準備完了」のまま空の盤面を表示する', () => {
    render(<App />)
    prepare('1', '0')
    place('味方1', 1, 1)
    click('確定')
    remove('味方1')
    expect(occupants()).toEqual([])
    expect(screen.getByRole('region', { name: '戦闘中' })).toBeVisible()
    expect(screen.getByRole('heading', { name: '準備完了' })).toBeVisible()
    expect(screen.getByRole('button', { name: '新しい戦闘を始める' })).toBeVisible()
    expect(screen.getByRole('button', { name: '駒を増やす' })).toBeVisible()
  })

  it('倒れたことを理由に自動で消さない: 戦闘中に移動・追加・確定を続けても、既存の駒は残る', () => {
    render(<App />)
    prepare('1', '1')
    place('味方1', 1, 1)
    place('敵1', 2, 2)
    click('確定')
    place('敵1', 9, 9)
    click('駒を増やす')
    fireEvent.change(screen.getByRole('textbox', { name: '敵の追加数' }), { target: { value: '1' } })
    click('追加する')
    place('敵2', 5, 5)
    click('追加分を確定')
    expect(occupants()).toEqual([
      'マス (1, 1) 味方1（味方・移動力5）', 'マス (5, 5) 敵2（敵・移動力5）', 'マス (9, 9) 敵1（敵・移動力5）',
    ])
  })
})
