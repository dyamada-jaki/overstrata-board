import type { Character } from '../domain/character.ts'
import { stepMovement } from '../domain/preparation.ts'
import './MovementControl.css'

export function MovementControl({ character, onStep, onClose }: {
  character: Character
  onStep: (delta: -1 | 1) => void
  onClose: () => void
}) {
  return (
    <div className={`movement-control movement-control-${character.side}`} role="group" aria-label={`${character.name}の移動力`}>
      <div className="movement-heading">
        <span>{character.name}の移動力</span>
        <button type="button" className="movement-close" aria-label="移動力の設定を閉じる" onClick={onClose}>×</button>
      </div>
      <div className="movement-steps">
        <button type="button" aria-label={`${character.name}の移動力を減らす`}
          disabled={stepMovement(character.movement, -1) === null} onClick={() => onStep(-1)}>−</button>
        <output aria-label={`${character.name}の移動力の値`}>{character.movement}</output>
        <button type="button" aria-label={`${character.name}の移動力を増やす`}
          disabled={stepMovement(character.movement, 1) === null} onClick={() => onStep(1)}>＋</button>
      </div>
    </div>
  )
}
