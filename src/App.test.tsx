import { render, screen } from '@testing-library/react'
import App from './App.tsx'

describe('App', () => {
  it('タイトル「Overstrata 戦闘ボード」を表示する', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Overstrata 戦闘ボード' })).toBeInTheDocument()
  })
})
