import { fireEvent, render, screen, within } from '@testing-library/react'
import App from './App.tsx'
import { Board } from './components/Board.tsx'
import { formatPosition } from './domain/board.ts'
import { getMovementRange, type Position } from './domain/movement.ts'

describe('App', () => {
  it('タイトル「Overstrata 戦闘ボード」を表示する', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Overstrata 戦闘ボード' })).toBeInTheDocument()
  })

  it('100マスと横・縦それぞれ左から右・上から下の1〜10を表示する', () => {
    render(<App />)
    const cells = screen.getAllByRole('button', { name: /^マス / })
    expect(cells).toHaveLength(100)
    const labels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
    for (const axis of ['横の座標', '縦の座標']) {
      expect(within(screen.getByRole('group', { name: axis })).getAllByText(/\d+/)
        .map((label) => label.textContent)).toEqual(labels)
    }
    expect(cells[0]).toHaveAccessibleName('マス (1, 1)')
    expect(cells[9]).toHaveAccessibleName('マス (10, 1)')
    expect(cells[90]).toHaveAccessibleName('マス (1, 10)')
    expect(cells[99]).toHaveAccessibleName('マス (10, 10)')
    expect(cells[32]).toHaveAccessibleName('マス (3, 4)')
  })

  it('未選択→1マス選択→余白で維持→別マスへ切替→同じマスで解除する', () => {
    render(<App />)
    const first = screen.getByRole('button', { name: 'マス (1, 1)' })
    const next = screen.getByRole('button', { name: 'マス (3, 4)' })
    expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0)

    fireEvent.click(screen.getByRole('main'))
    expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0)
    fireEvent.click(first)
    expect(screen.getAllByRole('button', { pressed: true })).toEqual([first])
    fireEvent.click(screen.getByRole('main'))
    expect(screen.getAllByRole('button', { pressed: true })).toEqual([first])
    fireEvent.click(next)
    expect(first).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getAllByRole('button', { pressed: true })).toEqual([next])
    fireEvent.click(next)
    expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0)
  })

  it('同じ列の別の空きマス (3, 4) → (3, 5) へ選択を切り替える', () => {
    render(<App />)
    const first = screen.getByRole('button', { name: 'マス (3, 4)' })
    const next = screen.getByRole('button', { name: 'マス (3, 5)' })
    expect(screen.queryAllByRole('button', { pressed: true })).toEqual([])

    fireEvent.click(first)
    expect(screen.queryAllByRole('button', { pressed: true })).toEqual([first])

    fireEvent.click(next)
    expect(first).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryAllByRole('button', { pressed: true })).toEqual([next])
  })

  it('同じ行の別の空きマス (3, 4) → (4, 4) へ選択を切り替える', () => {
    render(<App />)
    const first = screen.getByRole('button', { name: 'マス (3, 4)' })
    const next = screen.getByRole('button', { name: 'マス (4, 4)' })
    expect(screen.queryAllByRole('button', { pressed: true })).toEqual([])

    fireEvent.click(first)
    expect(screen.queryAllByRole('button', { pressed: true })).toEqual([first])

    fireEvent.click(next)
    expect(first).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryAllByRole('button', { pressed: true })).toEqual([next])
  })

  it('同じマスを選択→再タップで解除→もう一度タップして再選択する', () => {
    render(<App />)
    const cell = screen.getByRole('button', { name: 'マス (3, 4)' })
    expect(screen.queryAllByRole('button', { pressed: true })).toEqual([])

    fireEvent.click(cell)
    expect(screen.queryAllByRole('button', { pressed: true })).toEqual([cell])
    fireEvent.click(cell)
    expect(screen.queryAllByRole('button', { pressed: true })).toEqual([])
    fireEvent.click(cell)
    expect(screen.queryAllByRole('button', { pressed: true })).toEqual([cell])
  })

  it('列ラベル・行ラベル・盤面外の余白を押すたびに選択中のマスを維持する', () => {
    render(<App />)
    const cell = screen.getByRole('button', { name: 'マス (3, 4)' })
    const columns = screen.getByRole('group', { name: '横の座標' })
    const rows = screen.getByRole('group', { name: '縦の座標' })
    expect(screen.queryAllByRole('button', { pressed: true })).toEqual([])
    fireEvent.click(cell)
    expect(screen.queryAllByRole('button', { pressed: true })).toEqual([cell])

    fireEvent.click(within(columns).getByText('3'))
    expect(screen.queryAllByRole('button', { pressed: true })).toEqual([cell])
    fireEvent.click(within(columns).getByText('10'))
    expect(screen.queryAllByRole('button', { pressed: true })).toEqual([cell])
    fireEvent.click(within(rows).getByText('4'))
    expect(screen.queryAllByRole('button', { pressed: true })).toEqual([cell])
    fireEvent.click(within(rows).getByText('10'))
    expect(screen.queryAllByRole('button', { pressed: true })).toEqual([cell])
    fireEvent.click(screen.getByRole('main'))
    expect(screen.queryAllByRole('button', { pressed: true })).toEqual([cell])
    fireEvent.click(document.body)
    expect(screen.queryAllByRole('button', { pressed: true })).toEqual([cell])
  })

  it('3列2行の設定では6マスと対応する座標ラベルを表示する', () => {
    render(<Board size={{ width: 3, height: 2 }} />)
    expect(screen.getAllByRole('button').map((cell) => cell.getAttribute('aria-label')))
      .toEqual(['マス (1, 1)', 'マス (2, 1)', 'マス (3, 1)',
        'マス (1, 2)', 'マス (2, 2)', 'マス (3, 2)'])
    expect(within(screen.getByRole('group', { name: '横の座標' })).getAllByText(/\d+/)
      .map((label) => label.textContent)).toEqual(['1', '2', '3'])
    expect(within(screen.getByRole('group', { name: '縦の座標' })).getAllByText(/\d+/)
      .map((label) => label.textContent)).toEqual(['1', '2'])
  })
})

// 駒の準備（spec.md 2.2）の画面操作。
const pressed = () => screen.queryAllByRole('button', { pressed: true })
const nameOf = (element: HTMLElement) => element.getAttribute('aria-label')
const rangeNames = () => screen.queryAllByRole('button', { name: / 移動範囲$/ }).map(nameOf)
// 駒のいるマスは「マス (横, 縦) 名前（陣営）」。
const occupiedNames = () => screen.queryAllByRole('button', { name: /^マス .*（/ }).map(nameOf)
const cell = (label: string) => screen.getByRole('button', { name: new RegExp(`^マス ${escape(label)}`) })
const token = (name: string) => screen.getByRole('button', { name: new RegExp(`^マス .* ${name}（`) })
const countInput = (label: '味方の数' | '敵の数') => screen.getByRole('textbox', { name: label })
const prepareButton = () => screen.getByRole('button', { name: '駒を用意する' })
const unplacedList = () => screen.getByRole('region', { name: '未配置の駒' })
const unplaced = (name: string) => within(unplacedList()).getByRole('button', { name })
const unplacedNames = () => within(unplacedList()).queryAllByRole('button').map(nameOf)
const confirmButton = () => screen.getByRole('button', { name: '確定' })
const allCellsEmpty = () => expect(occupiedNames()).toEqual([])

function escape(text: string) {
  return text.replace(/[()]/g, '\\$&')
}

function setCounts(ally: string, enemy: string) {
  fireEvent.change(countInput('味方の数'), { target: { value: ally } })
  fireEvent.change(countInput('敵の数'), { target: { value: enemy } })
}

function prepare(ally: number, enemy: number) {
  setCounts(String(ally), String(enemy))
  fireEvent.click(prepareButton())
}

function place(name: string, label: string) {
  fireEvent.click(unplaced(name))
  fireEvent.click(cell(label))
}

function expectInitialScreen() {
  expect(screen.getAllByRole('button', { name: /^マス / })).toHaveLength(100)
  allCellsEmpty()
  expect(countInput('味方の数')).toHaveValue('0')
  expect(countInput('敵の数')).toHaveValue('0')
  expect(countInput('味方の数')).toBeEnabled()
  expect(countInput('敵の数')).toBeEnabled()
  expect(prepareButton()).toBeDisabled()
  expect(screen.getByText('味方か敵を1体以上にしてください')).toBeVisible()
  expect(screen.queryByRole('region', { name: '未配置の駒' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: '確定' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: '準備をやり直す' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: '新しい戦闘を始める' })).not.toBeInTheDocument()
  expect(pressed()).toEqual([])
  expect(rangeNames()).toEqual([])
}

const expectedRange = (origin: Position, others: Position[]) =>
  getMovementRange(origin, 5, others, { width: 10, height: 10 })
    .map((position) => `マス ${formatPosition(position)} 移動範囲`)

describe('数の指定（spec.md 2.2、計画で決めた入力と案内）', () => {
  const invalidMessage = '0〜10の整数で入力してください'

  it('起動時は空の10×10盤面と、双方0体の入力欄、押せない「駒を用意する」を表示する', () => {
    render(<App />)
    expectInitialScreen()
    expect(screen.queryByText(invalidMessage)).not.toBeInTheDocument()
  })

  it.each([
    { ally: '1', enemy: '0' },
    { ally: '0', enemy: '1' },
    { ally: '10', enemy: '10' },
    { ally: ' 3 ', enemy: '05' },
  ])('味方「$ally」・敵「$enemy」なら押せる', ({ ally, enemy }) => {
    render(<App />)
    setCounts(ally, enemy)
    expect(prepareButton()).toBeEnabled()
    expect(screen.queryByText(invalidMessage)).not.toBeInTheDocument()
    expect(screen.queryByText('味方か敵を1体以上にしてください')).not.toBeInTheDocument()
  })

  it.each(['11', '-1', '1.5', '', 'a', '３'])('味方「%s」は不正で、もう一方が1体でも押せず、その欄の下に案内する', (value) => {
    render(<App />)
    setCounts(value, '1')
    expect(prepareButton()).toBeDisabled()
    const ally = countInput('味方の数')
    expect(ally).toHaveAttribute('aria-invalid', 'true')
    expect(ally).toHaveAccessibleDescription(invalidMessage)
    expect(countInput('敵の数')).toHaveAttribute('aria-invalid', 'false')
    expect(screen.getAllByText(invalidMessage)).toHaveLength(1)
    expect(screen.getByRole('button', { name: '味方の数を減らす' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '味方の数を増やす' })).toBeDisabled()
  })

  it('敵の欄だけが不正なら、敵の欄に案内する', () => {
    render(<App />)
    setCounts('1', '11')
    expect(prepareButton()).toBeDisabled()
    expect(countInput('敵の数')).toHaveAccessibleDescription(invalidMessage)
    expect(countInput('味方の数')).toHaveAttribute('aria-invalid', 'false')
  })

  it('「−」「＋」は0〜10の範囲で1ずつ増減し、両端では押せない', () => {
    render(<App />)
    const minus = screen.getByRole('button', { name: '敵の数を減らす' })
    const plus = screen.getByRole('button', { name: '敵の数を増やす' })
    expect(minus).toBeDisabled()
    expect(plus).toBeEnabled()
    fireEvent.click(plus)
    expect(countInput('敵の数')).toHaveValue('1')
    expect(countInput('味方の数')).toHaveValue('0')
    expect(prepareButton()).toBeEnabled()
    fireEvent.click(minus)
    expect(countInput('敵の数')).toHaveValue('0')
    expect(prepareButton()).toBeDisabled()

    fireEvent.change(countInput('敵の数'), { target: { value: '9' } })
    fireEvent.click(plus)
    expect(countInput('敵の数')).toHaveValue('10')
    expect(plus).toBeDisabled()
    expect(minus).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: '味方の数を増やす' }))
    expect(countInput('味方の数')).toHaveValue('1')
  })

  it('双方0体のまま押しても、駒を用意せず準備も進まない', () => {
    render(<App />)
    fireEvent.click(prepareButton())
    expectInitialScreen()
  })
})

describe('駒の用意と未配置一覧（spec.md 2.2）', () => {
  it('味方3・敵2を用意すると、未配置一覧に番号順で並び、盤面は空のまま、数は変えられない', () => {
    render(<App />)
    prepare(3, 2)
    expect(unplacedNames()).toEqual(['味方1', '味方2', '味方3', '敵1', '敵2'])
    allCellsEmpty()
    expect(countInput('味方の数')).toHaveValue('3')
    expect(countInput('味方の数')).toBeDisabled()
    expect(countInput('敵の数')).toBeDisabled()
    expect(screen.getByRole('button', { name: '味方の数を増やす' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: '駒を用意する' })).not.toBeInTheDocument()
    expect(screen.getByText('数を変えるときは「準備をやり直す」を押してください')).toBeVisible()
    expect(screen.getByRole('button', { name: '準備をやり直す' })).toBeEnabled()
    expect(pressed()).toEqual([])
  })

  it('双方10体なら20体を用意し、10番の駒は盤面でも「10」と読める', () => {
    render(<App />)
    prepare(10, 10)
    expect(unplacedNames()).toEqual([
      ...Array.from({ length: 10 }, (_, index) => `味方${index + 1}`),
      ...Array.from({ length: 10 }, (_, index) => `敵${index + 1}`),
    ])
    place('味方10', '(1, 1)')
    place('敵10', '(2, 1)')
    expect(token('味方10')).toHaveAccessibleName('マス (1, 1) 味方10（味方）')
    expect(token('味方10')).toHaveTextContent(/^10$/)
    expect(token('敵10')).toHaveAccessibleName('マス (2, 1) 敵10（敵）')
    expect(token('敵10')).toHaveTextContent(/^10$/)
  })

  it.each([
    { ally: 0, enemy: 2, names: ['敵1', '敵2'] },
    { ally: 2, enemy: 0, names: ['味方1', '味方2'] },
  ])('味方 $ally, 敵 $enemy なら片側だけを用意する', ({ ally, enemy, names }) => {
    render(<App />)
    prepare(ally, enemy)
    expect(unplacedNames()).toEqual(names)
  })

  it('同じ陣営は同じ色の印、別の陣営は別の印で表示し、番号で見分ける', () => {
    render(<App />)
    prepare(2, 2)
    place('味方1', '(1, 1)')
    place('味方2', '(2, 1)')
    place('敵1', '(3, 1)')
    place('敵2', '(4, 1)')
    const markOf = (name: string) => within(token(name)).getByText(/^\d+$/)
    expect(markOf('味方1')).toHaveTextContent('1')
    expect(markOf('味方2')).toHaveTextContent('2')
    expect(markOf('敵1')).toHaveTextContent('1')
    expect(markOf('味方1').className).toBe(markOf('味方2').className)
    expect(markOf('敵1').className).toBe(markOf('敵2').className)
    expect(markOf('味方1').className).not.toBe(markOf('敵1').className)
  })
})

describe('駒の配置と選択（spec.md 2.2）', () => {
  it('一覧の駒を選んで空きマスを押すと、その駒だけを置き、一覧から外して選択と範囲を解除する', () => {
    render(<App />)
    prepare(2, 1)
    fireEvent.click(unplaced('味方1'))
    expect(pressed()).toEqual([unplaced('味方1')])
    expect(rangeNames()).toEqual([])
    fireEvent.click(cell('(3, 8)'))
    expect(occupiedNames()).toEqual(['マス (3, 8) 味方1（味方）'])
    expect(unplacedNames()).toEqual(['味方2', '敵1'])
    expect(pressed()).toEqual([])
    expect(rangeNames()).toEqual([])

    // 選択が残っていれば、ここで味方1が (1, 1) へ動いてしまう。
    fireEvent.click(cell('(1, 1)'))
    expect(pressed()).toEqual([cell('(1, 1)')])
    expect(occupiedNames()).toEqual(['マス (3, 8) 味方1（味方）'])
  })

  it('一覧の駒を再タップすると選択を解除し、別の一覧の駒では置かずに選択だけ切り替える', () => {
    render(<App />)
    prepare(1, 1)
    fireEvent.click(unplaced('味方1'))
    fireEvent.click(unplaced('味方1'))
    expect(pressed()).toEqual([])
    fireEvent.click(unplaced('味方1'))
    fireEvent.click(unplaced('敵1'))
    expect(pressed()).toEqual([unplaced('敵1')])
    expect(unplacedNames()).toEqual(['味方1', '敵1'])
    allCellsEmpty()
  })

  it('マス選択中に一覧の駒を押すと、マスの選択を外して駒だけを選択する', () => {
    render(<App />)
    prepare(1, 0)
    fireEvent.click(cell('(5, 5)'))
    expect(pressed()).toEqual([cell('(5, 5)')])
    fireEvent.click(unplaced('味方1'))
    expect(pressed()).toEqual([unplaced('味方1')])
    allCellsEmpty()
  })

  it('未配置の駒を選択中に駒のいるマスを押すと、置かずにその駒へ切り替え、範囲を出す', () => {
    render(<App />)
    prepare(2, 0)
    place('味方1', '(1, 1)')
    fireEvent.click(unplaced('味方2'))
    fireEvent.click(token('味方1'))
    expect(occupiedNames()).toEqual(['マス (1, 1) 味方1（味方）'])
    expect(unplacedNames()).toEqual(['味方2'])
    expect(pressed()).toEqual([token('味方1')])
    expect(rangeNames()).toEqual(expectedRange({ x: 0, y: 0 }, []))
  })

  it('盤面の駒を選択中に一覧の駒を押すと、どちらも動かさず選択だけ切り替え、範囲を消す', () => {
    render(<App />)
    prepare(1, 1)
    place('味方1', '(1, 1)')
    fireEvent.click(token('味方1'))
    expect(rangeNames()).not.toEqual([])
    fireEvent.click(unplaced('敵1'))
    expect(pressed()).toEqual([unplaced('敵1')])
    expect(rangeNames()).toEqual([])
    expect(occupiedNames()).toEqual(['マス (1, 1) 味方1（味方）'])
    expect(unplacedNames()).toEqual(['敵1'])
  })

  it('準備中の駒は移動力5の範囲を出し、範囲内外の空きマスへ位置を直せる', () => {
    render(<App />)
    prepare(2, 0)
    place('味方1', '(1, 1)')
    place('味方2', '(4, 1)')
    fireEvent.click(token('味方1'))
    // 移動力5。(6, 1) は距離5で範囲内、(7, 1) は距離6で範囲外、(4, 4) は斜め3で距離4。味方2のマスは除く。
    expect(rangeNames()).toEqual(expectedRange({ x: 0, y: 0 }, [{ x: 3, y: 0 }]))
    expect(rangeNames()).toContain('マス (6, 1) 移動範囲')
    expect(rangeNames()).toContain('マス (4, 4) 移動範囲')
    expect(rangeNames()).not.toContain('マス (7, 1) 移動範囲')
    expect(rangeNames()).not.toContain('マス (4, 1) 移動範囲')
    fireEvent.click(cell('(10, 10)'))
    expect(occupiedNames()).toEqual(['マス (4, 1) 味方2（味方）', 'マス (10, 10) 味方1（味方）'])
    expect(pressed()).toEqual([])
    expect(rangeNames()).toEqual([])
  })
})

describe('確定（spec.md 2.2）', () => {
  it('未配置が残る間は確定できず、全駒を置いても自動では確定しない', () => {
    render(<App />)
    prepare(1, 1)
    expect(confirmButton()).toBeDisabled()
    expect(screen.getByText('未配置の駒が残っています（残り2体）')).toBeVisible()
    place('味方1', '(1, 1)')
    expect(confirmButton()).toBeDisabled()
    expect(screen.getByText('未配置の駒が残っています（残り1体）')).toBeVisible()
    place('敵1', '(2, 1)')
    expect(confirmButton()).toBeEnabled()
    expect(screen.getByText('すべて配置しました。「確定」を押すと準備が完了します。')).toBeVisible()
    expect(screen.getByRole('button', { name: '準備をやり直す' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '新しい戦闘を始める' })).not.toBeInTheDocument()
  })

  it('確定すると選択と範囲を解除し、配置を引き継いで駒を選択・移動できる', () => {
    render(<App />)
    prepare(1, 1)
    place('味方1', '(1, 1)')
    place('敵1', '(2, 1)')
    fireEvent.click(token('味方1'))
    expect(rangeNames()).not.toEqual([])
    fireEvent.click(confirmButton())
    expect(pressed()).toEqual([])
    expect(rangeNames()).toEqual([])
    expect(occupiedNames()).toEqual(['マス (1, 1) 味方1（味方）', 'マス (2, 1) 敵1（敵）'])
    expect(screen.queryByRole('button', { name: '確定' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '準備をやり直す' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '未配置の駒' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '新しい戦闘を始める' })).toBeEnabled()

    fireEvent.click(token('味方1'))
    expect(rangeNames()).toEqual(expectedRange({ x: 0, y: 0 }, [{ x: 1, y: 0 }]))
    fireEvent.click(cell('(5, 5)'))
    expect(occupiedNames()).toEqual(['マス (2, 1) 敵1（敵）', 'マス (5, 5) 味方1（味方）'])
  })
})

describe('準備をやり直す・新しい戦闘を始める（spec.md 2.2）', () => {
  const dialog = () => screen.getByRole('alertdialog')

  it('準備をやり直すは確認を取り消すと状態を保ち、実行すると最初の準備画面へ戻る', () => {
    render(<App />)
    prepare(2, 1)
    place('味方1', '(1, 1)')
    fireEvent.click(token('味方1'))
    const range = rangeNames()

    fireEvent.click(screen.getByRole('button', { name: '準備をやり直す' }))
    expect(dialog()).toHaveAccessibleName('準備をやり直す')
    expect(dialog()).toHaveTextContent('今の戦闘の準備を最初からやり直します。')
    expect(dialog()).toHaveTextContent('全駒と、味方・敵の数の設定を消して、最初の準備画面へ戻ります。')
    fireEvent.click(within(dialog()).getByRole('button', { name: 'キャンセル' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(occupiedNames()).toEqual(['マス (1, 1) 味方1（味方）'])
    expect(unplacedNames()).toEqual(['味方2', '敵1'])
    expect(pressed()).toEqual([token('味方1')])
    expect(rangeNames()).toEqual(range)
    expect(countInput('味方の数')).toHaveValue('2')
    expect(confirmButton()).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: '準備をやり直す' }))
    fireEvent.click(within(dialog()).getByRole('button', { name: 'やり直す' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expectInitialScreen()

    // 数の指定からやり直せる。
    prepare(0, 1)
    expect(unplacedNames()).toEqual(['敵1'])
  })

  it('新しい戦闘を始めるは確認を取り消すと確定後の状態を保ち、実行すると準備から始め直せる', () => {
    render(<App />)
    prepare(1, 0)
    place('味方1', '(3, 3)')
    fireEvent.click(confirmButton())
    fireEvent.click(cell('(5, 5)'))

    fireEvent.click(screen.getByRole('button', { name: '新しい戦闘を始める' }))
    expect(dialog()).toHaveAccessibleName('新しい戦闘を始める')
    expect(dialog()).toHaveTextContent('次の戦闘の準備をゼロから始めます。')
    expect(dialog()).toHaveTextContent('全駒と、味方・敵の数の設定を消して、最初の準備画面へ戻ります。')
    fireEvent.click(within(dialog()).getByRole('button', { name: 'キャンセル' }))
    expect(occupiedNames()).toEqual(['マス (3, 3) 味方1（味方）'])
    expect(pressed()).toEqual([cell('(5, 5)')])
    expect(screen.getByRole('button', { name: '新しい戦闘を始める' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '確定' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '新しい戦闘を始める' }))
    fireEvent.click(within(dialog()).getByRole('button', { name: '始める' }))
    expectInitialScreen()

    prepare(1, 1)
    place('味方1', '(1, 1)')
    place('敵1', '(1, 2)')
    fireEvent.click(token('敵1'))
    expect(rangeNames()).toEqual(expectedRange({ x: 0, y: 1 }, [{ x: 0, y: 0 }]))
    fireEvent.click(confirmButton())
    expect(screen.getByRole('button', { name: '新しい戦闘を始める' })).toBeInTheDocument()
    expect(occupiedNames()).toEqual(['マス (1, 1) 味方1（味方）', 'マス (1, 2) 敵1（敵）'])
  })
})

describe('確定後の選択と移動（spec.md 2.1・2.3、#9 と同じ配置）', () => {
  // #9 のサンプルと同じ表示座標へ置いて確定する。移動力は全駒5（spec.md 3.2）。
  const initial = [
    'マス (7, 2) 敵2（敵）',
    'マス (4, 3) 敵1（敵）',
    'マス (3, 8) 味方1（味方）',
    'マス (6, 9) 味方2（味方）',
  ]
  const ally1 = { x: 2, y: 7 }
  const ally2 = { x: 5, y: 8 }
  const enemy1 = { x: 3, y: 2 }
  const enemy2 = { x: 6, y: 1 }

  function startBattle() {
    render(<App />)
    prepare(2, 2)
    place('味方1', '(3, 8)')
    place('味方2', '(6, 9)')
    place('敵1', '(4, 3)')
    place('敵2', '(7, 2)')
    fireEvent.click(confirmButton())
    expect(occupiedNames()).toEqual(initial)
  }

  it('未選択で駒を押すと、その1体だけを選択し、敵1のマスを除いた移動範囲を表示する', () => {
    startBattle()
    const target = token('味方1')
    fireEvent.click(target)
    expect(pressed()).toEqual([target])
    expect(target).toHaveAccessibleName('マス (3, 8) 味方1（味方）')
    // 敵1 (4, 3) は距離5でも除かれる。
    expect(rangeNames()).toEqual(expectedRange(ally1, [ally2, enemy1, enemy2]))
    expect(rangeNames()).toContain('マス (3, 3) 移動範囲')
    expect(rangeNames()).not.toContain('マス (3, 2) 移動範囲')
    expect(token('敵1')).toHaveAccessibleName('マス (4, 3) 敵1（敵）')
  })

  it('マス選択中に駒を押すと、マスの選択を外して駒だけを選択する', () => {
    startBattle()
    const first = cell('(1, 1)')
    fireEvent.click(first)
    expect(pressed()).toEqual([first])
    const target = token('味方1')
    fireEvent.click(target)
    expect(first).toHaveAttribute('aria-pressed', 'false')
    expect(pressed()).toEqual([target])
    expect(rangeNames()).toEqual(expectedRange(ally1, [ally2, enemy1, enemy2]))
  })

  it('駒の選択中に別の駒を押すと、誰も移動せず選択と範囲だけが切り替わる', () => {
    startBattle()
    fireEvent.click(token('味方1'))
    fireEvent.click(token('敵1'))
    expect(occupiedNames()).toEqual(initial)
    expect(pressed()).toEqual([token('敵1')])
    // (4, 1) は敵1の範囲で、味方1からは距離7。
    expect(rangeNames()).toEqual(expectedRange(enemy1, [ally1, ally2, enemy2]))
    expect(rangeNames()).toContain('マス (4, 1) 移動範囲')
  })

  it('範囲内の空きマスへ移動すると選択と範囲が消え、次の空きマスはマス選択になる', () => {
    startBattle()
    const destination = cell('(3, 4)')
    fireEvent.click(token('味方1'))
    expect(destination).toHaveAccessibleName('マス (3, 4) 移動範囲')
    fireEvent.click(destination)
    expect(occupiedNames()).toEqual([
      'マス (7, 2) 敵2（敵）',
      'マス (4, 3) 敵1（敵）',
      'マス (3, 4) 味方1（味方）',
      'マス (6, 9) 味方2（味方）',
    ])
    expect(cell('(3, 8)')).toHaveAccessibleName('マス (3, 8)')
    expect(pressed()).toEqual([])
    expect(rangeNames()).toEqual([])

    const next = cell('(1, 1)')
    fireEvent.click(next)
    expect(pressed()).toEqual([next])
    expect(token('味方1')).toHaveAccessibleName('マス (3, 4) 味方1（味方）')
  })

  it('範囲外の空きマスにも移動でき、移動先から新しい範囲を表示する', () => {
    startBattle()
    const destination = cell('(1, 1)')
    fireEvent.click(token('味方2'))
    // (1, 1) は味方2から距離10で範囲外。
    expect(rangeNames()).toEqual(expectedRange(ally2, [ally1, enemy1, enemy2]))
    expect(destination).toHaveAccessibleName('マス (1, 1)')
    fireEvent.click(destination)
    expect(token('味方2')).toHaveAccessibleName('マス (1, 1) 味方2（味方）')
    expect(pressed()).toEqual([])
    expect(rangeNames()).toEqual([])

    fireEvent.click(token('味方2'))
    expect(rangeNames()).toEqual(expectedRange({ x: 0, y: 0 }, [ally1, enemy1, enemy2]))
  })

  it('選択中の駒を再タップすると、位置を変えず選択と範囲を解除する', () => {
    startBattle()
    const target = token('味方1')
    fireEvent.click(target)
    fireEvent.click(target)
    expect(occupiedNames()).toEqual(initial)
    expect(pressed()).toEqual([])
    expect(rangeNames()).toEqual([])
  })

  it('駒の選択中に座標ラベル・盤面外の余白を押しても、選択・範囲・位置を変えない', () => {
    startBattle()
    const target = token('味方1')
    fireEvent.click(target)
    const range = rangeNames()
    for (const element of [
      within(screen.getByRole('group', { name: '横の座標' })).getByText('3'),
      within(screen.getByRole('group', { name: '縦の座標' })).getByText('8'),
      screen.getByRole('main'),
      document.body,
    ]) {
      fireEvent.click(element)
      expect(pressed()).toEqual([target])
      expect(rangeNames()).toEqual(range)
      expect(occupiedNames()).toEqual(initial)
    }
  })
})
