import { boardSize } from '../data/board.ts'
import { Board } from './Board.tsx'

export function BattleScreen() {
  return <Board size={boardSize} />
}
