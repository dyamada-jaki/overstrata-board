import { fireEvent, render, screen, within } from '@testing-library/react'
import App from './App.tsx'

function cell(name: string) {
  return screen.getByRole('button', { name })
}

function pressedCells() {
  return screen
    .getAllByRole('button')
    .filter((button) => button.getAttribute('aria-pressed') === 'true')
    .map((button) => button.getAttribute('aria-label'))
}

describe('App', () => {
  it('タイトル「Overstrata 戦闘ボード」を表示する', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Overstrata 戦闘ボード' })).toBeInTheDocument()
  })

  it('10×10の100マスを表示し、左上が (1, 1)、右下が (10, 10) になる', () => {
    render(<App />)
    const board = screen.getByRole('table', { name: '盤面' })
    const cells = within(board).getAllByRole('button')

    expect(cells).toHaveLength(100)
    expect(cells[0]).toHaveAccessibleName('(1, 1)')
    expect(cells[1]).toHaveAccessibleName('(2, 1)')
    expect(cells[10]).toHaveAccessibleName('(1, 2)')
    expect(cells[99]).toHaveAccessibleName('(10, 10)')
  })

  it('列ラベルは左から右へ1〜10、行ラベルは上から下へ1〜10', () => {
    render(<App />)
    const board = screen.getByRole('table', { name: '盤面' })
    const numbers = Array.from({ length: 10 }, (_, index) => String(index + 1))

    expect(within(board).getAllByRole('columnheader').map((label) => label.textContent)).toEqual(numbers)
    expect(within(board).getAllByRole('rowheader').map((label) => label.textContent)).toEqual(numbers)
  })

  it('最初はどのマスも選択していない', () => {
    render(<App />)
    expect(pressedCells()).toEqual([])
  })

  it('マスをタップするとその1マスだけを選択する', () => {
    render(<App />)
    fireEvent.click(cell('(3, 4)'))
    expect(pressedCells()).toEqual(['(3, 4)'])
  })

  it('別のマスをタップすると選択が切り替わる', () => {
    render(<App />)
    fireEvent.click(cell('(3, 4)'))
    fireEvent.click(cell('(5, 6)'))
    expect(pressedCells()).toEqual(['(5, 6)'])
  })

  it('選択中のマスを再タップすると解除する', () => {
    render(<App />)
    fireEvent.click(cell('(3, 4)'))
    fireEvent.click(cell('(3, 4)'))
    expect(pressedCells()).toEqual([])
  })

  it('解除したマスをもう一度タップすると再び選択する', () => {
    render(<App />)
    fireEvent.click(cell('(3, 4)'))
    fireEvent.click(cell('(3, 4)'))
    fireEvent.click(cell('(3, 4)'))
    expect(pressedCells()).toEqual(['(3, 4)'])
  })

  it('盤面外の余白や座標ラベルをタップしても選択は変わらない', () => {
    render(<App />)
    fireEvent.click(cell('(5, 6)'))
    const board = screen.getByRole('table', { name: '盤面' })

    fireEvent.click(screen.getByRole('main'))
    fireEvent.click(within(board).getAllByRole('columnheader')[0]!)
    fireEvent.click(within(board).getAllByRole('rowheader')[0]!)
    fireEvent.click(document.body)

    expect(pressedCells()).toEqual(['(5, 6)'])
  })

  it('未選択のときに余白をタップしても未選択のまま', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('main'))
    expect(pressedCells()).toEqual([])
  })
})
