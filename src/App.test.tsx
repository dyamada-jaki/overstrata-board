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

  it('同じマスを選択→再タップで解除→もう一度タップで再選択できる', () => {
    render(<App />)
    const target = screen.getByRole('button', { name: 'マス (3, 4)' })

    fireEvent.click(target)
    expect(screen.queryAllByRole('button', { pressed: true })).toEqual([target])
    fireEvent.click(target)
    expect(screen.queryAllByRole('button', { pressed: true })).toEqual([])
    fireEvent.click(target)
    expect(screen.queryAllByRole('button', { pressed: true })).toEqual([target])
  })

  it('マス選択中に列ラベル・行ラベル・盤面外の余白を押しても選択は変わらない', () => {
    render(<App />)
    const target = screen.getByRole('button', { name: 'マス (3, 4)' })
    const columns = screen.getByRole('group', { name: '横の座標' })
    const rows = screen.getByRole('group', { name: '縦の座標' })
    fireEvent.click(target)

    // 選択中のマスと同じ列・行のラベルも含め、押すたびに直後の選択を確かめる。
    for (const outside of [
      within(columns).getByText('3'),
      within(columns).getByText('1'),
      within(rows).getByText('4'),
      within(rows).getByText('1'),
      screen.getByRole('main'),
      document.body,
    ]) {
      fireEvent.click(outside)
      expect(screen.queryAllByRole('button', { pressed: true })).toEqual([target])
    }
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
