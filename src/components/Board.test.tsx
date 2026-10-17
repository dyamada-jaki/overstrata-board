import { render, screen, within } from '@testing-library/react'
import Board from './Board.tsx'

describe('Board', () => {
  it('渡された盤面サイズ（横3・縦2）のマスと座標ラベルを表示する', () => {
    render(<Board size={{ width: 3, height: 2 }} selected={null} onCellClick={() => {}} />)
    const board = screen.getByRole('table', { name: '盤面' })

    expect(within(board).getAllByRole('button').map((cell) => cell.getAttribute('aria-label'))).toEqual([
      '(1, 1)', '(2, 1)', '(3, 1)',
      '(1, 2)', '(2, 2)', '(3, 2)',
    ])
    expect(within(board).getAllByRole('columnheader').map((label) => label.textContent)).toEqual(['1', '2', '3'])
    expect(within(board).getAllByRole('rowheader').map((label) => label.textContent)).toEqual(['1', '2'])
  })
})
