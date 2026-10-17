import { fireEvent, render, screen, within } from '@testing-library/react'
import App from './App.tsx'
import { Board } from './components/Board.tsx'

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
