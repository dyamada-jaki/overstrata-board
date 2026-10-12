import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { App } from './App'

it('戦闘ボードの見出しを表示する', () => {
  render(<App />)
  expect(screen.getByRole('heading', { level: 1, name: 'Overstrata 戦闘ボード' })).toBeInTheDocument()
})
