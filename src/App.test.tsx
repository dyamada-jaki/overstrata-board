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

describe('キャラの選択と移動（spec.md 2.2・2.3）', () => {
  const pressed = () => screen.queryAllByRole('button', { pressed: true })
  const nameOf = (element: HTMLElement) => element.getAttribute('aria-label')
  const rangeNames = () => screen.queryAllByRole('button', { name: / 移動範囲$/ }).map(nameOf)
  const occupiedNames = () => screen.getAllByRole('button', { name: /（/ }).map(nameOf)
  const character = (name: string) => screen.getByRole('button', { name: new RegExp(` ${name}（`) })
  const expectedRange = (origin: Position, movement: number, others: Position[]) =>
    getMovementRange(origin, movement, others, { width: 10, height: 10 })
      .map((position) => `マス ${formatPosition(position)} 移動範囲`)

  // spec.md 2.2 の表（表示座標）と、それに対応する内部座標。
  const initial = [
    'マス (7, 2) 敵2（敵・軽装）',
    'マス (4, 3) 敵1（敵・中装）',
    'マス (3, 8) 味方1（味方・軽装）',
    'マス (6, 9) 味方2（味方・重装）',
  ]
  const ally1 = { x: 2, y: 7 }
  const ally2 = { x: 5, y: 8 }
  const enemy1 = { x: 3, y: 2 }
  const enemy2 = { x: 6, y: 1 }

  it('サンプル4体を表の表示座標のマスに、名前・陣営・装備付きで重複なく表示する', () => {
    render(<App />)
    expect(screen.getAllByRole('button', { name: /^マス / })).toHaveLength(100)
    expect(occupiedNames()).toEqual(initial)
    for (const name of ['味方1', '味方2', '敵1', '敵2']) {
      expect(within(character(name)).getByText(name)).toBeVisible()
    }
    // 内部座標をそのまま表示座標にした (3, 8) → (2, 7) などには置かない。
    for (const label of ['マス (2, 7)', 'マス (5, 8)', 'マス (3, 2)', 'マス (6, 1)']) {
      expect(screen.getByRole('button', { name: label })).toHaveAccessibleName(label)
    }
    expect(pressed()).toEqual([])
    expect(rangeNames()).toEqual([])
  })

  it('未選択でキャラを押すと、その1体だけを選択し、敵1のマスを除いた移動範囲を表示する', () => {
    render(<App />)
    const target = character('味方1')
    fireEvent.click(target)
    expect(pressed()).toEqual([target])
    expect(target).toHaveAccessibleName('マス (3, 8) 味方1（味方・軽装）')
    // 軽装の移動力5。敵1 (4, 3) は距離5でも除かれる。
    expect(rangeNames()).toEqual(expectedRange(ally1, 5, [ally2, enemy1, enemy2]))
    expect(rangeNames()).toContain('マス (3, 3) 移動範囲')
    expect(rangeNames()).not.toContain('マス (3, 2) 移動範囲')
    expect(character('敵1')).toHaveAccessibleName('マス (4, 3) 敵1（敵・中装）')
  })

  it('マス選択中にキャラを押すと、マスの選択を外してキャラだけを選択する', () => {
    render(<App />)
    const cell = screen.getByRole('button', { name: 'マス (1, 1)' })
    fireEvent.click(cell)
    expect(pressed()).toEqual([cell])
    const target = character('味方1')
    fireEvent.click(target)
    expect(cell).toHaveAttribute('aria-pressed', 'false')
    expect(pressed()).toEqual([target])
    expect(rangeNames()).toEqual(expectedRange(ally1, 5, [ally2, enemy1, enemy2]))
  })

  it('キャラ選択中に別キャラを押すと、誰も移動せず選択と範囲だけが切り替わる', () => {
    render(<App />)
    fireEvent.click(character('味方1'))
    fireEvent.click(character('敵1'))
    expect(occupiedNames()).toEqual(initial)
    expect(pressed()).toEqual([character('敵1')])
    // 中装の移動力4。(4, 1) は敵1の範囲で、味方1からは距離7。
    expect(rangeNames()).toEqual(expectedRange(enemy1, 4, [ally1, ally2, enemy2]))
    expect(rangeNames()).toContain('マス (4, 1) 移動範囲')
  })

  it('範囲内の空きマスへ移動すると選択と範囲が消え、次の空きマスはマス選択になる', () => {
    render(<App />)
    const destination = screen.getByRole('button', { name: 'マス (3, 4)' })
    fireEvent.click(character('味方1'))
    expect(destination).toHaveAccessibleName('マス (3, 4) 移動範囲')
    fireEvent.click(destination)
    expect(occupiedNames()).toEqual([
      'マス (7, 2) 敵2（敵・軽装）',
      'マス (4, 3) 敵1（敵・中装）',
      'マス (3, 4) 味方1（味方・軽装）',
      'マス (6, 9) 味方2（味方・重装）',
    ])
    expect(screen.getByRole('button', { name: 'マス (3, 8)' })).toHaveAccessibleName('マス (3, 8)')
    expect(pressed()).toEqual([])
    expect(rangeNames()).toEqual([])

    // キャラの選択が残っていれば、ここで味方1が (1, 1) へ動いてしまう。
    const next = screen.getByRole('button', { name: 'マス (1, 1)' })
    fireEvent.click(next)
    expect(pressed()).toEqual([next])
    expect(character('味方1')).toHaveAccessibleName('マス (3, 4) 味方1（味方・軽装）')
  })

  it('範囲外の空きマスにも移動でき、移動先から新しい範囲を表示する', () => {
    render(<App />)
    const destination = screen.getByRole('button', { name: 'マス (1, 1)' })
    fireEvent.click(character('味方2'))
    // 重装の移動力3。(1, 1) は距離10で範囲外。
    expect(rangeNames()).toEqual(expectedRange(ally2, 3, [ally1, enemy1, enemy2]))
    expect(destination).toHaveAccessibleName('マス (1, 1)')
    fireEvent.click(destination)
    expect(character('味方2')).toHaveAccessibleName('マス (1, 1) 味方2（味方・重装）')
    expect(pressed()).toEqual([])
    expect(rangeNames()).toEqual([])

    fireEvent.click(character('味方2'))
    expect(rangeNames()).toEqual(expectedRange({ x: 0, y: 0 }, 3, [ally1, enemy1, enemy2]))
  })

  it('選択中のキャラを再タップすると、位置を変えず選択と範囲を解除する', () => {
    render(<App />)
    const target = character('味方1')
    fireEvent.click(target)
    fireEvent.click(target)
    expect(occupiedNames()).toEqual(initial)
    expect(pressed()).toEqual([])
    expect(rangeNames()).toEqual([])
  })

  it('キャラ選択中に座標ラベル・盤面外の余白を押しても、選択・範囲・位置を変えない', () => {
    render(<App />)
    const target = character('味方1')
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
