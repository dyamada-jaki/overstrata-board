import {
  canConfirm,
  canPrepareTokens,
  confirmPlacement,
  createBattle,
  parseTokenCount,
  prepareTokens,
  stepTokenCount,
  tapToken,
  type BattleState,
} from './battle.ts'
import type { Character } from './character.ts'

const initial: BattleState = { stage: 'counts', characters: [], selection: { kind: 'none' } }

describe('parseTokenCount（spec.md 2.2: 0〜10の整数）', () => {
  it.each([
    { input: '0', count: 0 },
    { input: '1', count: 1 },
    { input: '10', count: 10 },
    { input: '05', count: 5 },
    { input: ' 3 ', count: 3 },
  ])('「$input」は $count', ({ input, count }) => {
    expect(parseTokenCount(input)).toBe(count)
  })

  it.each(['', ' ', '11', '100', '-1', '-0', '1.5', '1.0', '+1', 'a', '1a', '３', '1e1'])(
    '「%s」は不正',
    (input) => {
      expect(parseTokenCount(input)).toBeNull()
    },
  )
})

describe('stepTokenCount（「−」「＋」で0〜10を1ずつ）', () => {
  it.each([
    { input: '0', delta: 1, next: 1 },
    { input: '9', delta: 1, next: 10 },
    { input: '1', delta: -1, next: 0 },
    { input: '10', delta: -1, next: 9 },
    { input: ' 05 ', delta: 1, next: 6 },
  ] as const)('「$input」に $delta で $next', ({ input, delta, next }) => {
    expect(stepTokenCount(input, delta)).toBe(next)
  })

  it.each([
    { input: '0', delta: -1 },
    { input: '10', delta: 1 },
    { input: '', delta: 1 },
    { input: '11', delta: -1 },
    { input: '1.5', delta: 1 },
  ] as const)('「$input」に $delta は押せない', ({ input, delta }) => {
    expect(stepTokenCount(input, delta)).toBeNull()
  })
})

describe('canPrepareTokens', () => {
  it.each([
    { ally: 0, enemy: 0, ok: false },
    { ally: 1, enemy: 0, ok: true },
    { ally: 0, enemy: 1, ok: true },
    { ally: 10, enemy: 10, ok: true },
    { ally: null, enemy: 1, ok: false },
    { ally: 1, enemy: null, ok: false },
    { ally: null, enemy: null, ok: false },
  ])('味方 $ally, 敵 $enemy → $ok', ({ ally, enemy, ok }) => {
    expect(canPrepareTokens(ally, enemy)).toBe(ok)
  })
})

describe('駒の準備と確定（spec.md 2.2）', () => {
  const token = (side: 'ally' | 'enemy', number: number): Character => ({
    id: `${side}-${number}`,
    name: `${side === 'ally' ? '味方' : '敵'}${number}`,
    side,
    number,
    movement: 5,
    position: null,
  })

  it('最初の状態は数の指定で、駒も選択も無い', () => {
    expect(createBattle()).toEqual(initial)
  })

  it('指定した数の駒を、味方→敵の番号順に、移動力5・未配置で用意する', () => {
    const state = Object.freeze(createBattle())
    expect(prepareTokens(state, 2, 1)).toEqual({
      stage: 'placing',
      characters: [token('ally', 1), token('ally', 2), token('enemy', 1)],
      selection: { kind: 'none' },
    })
    expect(state).toEqual(initial)
  })

  it('双方10体で20体、10番は「味方10」「敵10」になる', () => {
    const { characters } = prepareTokens(createBattle(), 10, 10)
    expect(characters).toHaveLength(20)
    expect(characters[9]).toEqual(token('ally', 10))
    expect(characters[19]).toEqual(token('enemy', 10))
  })

  it('片側0体なら、もう片側だけを用意する', () => {
    expect(prepareTokens(createBattle(), 0, 3).characters).toEqual([1, 2, 3].map((n) => token('enemy', n)))
  })

  it.each([
    { ally: 0, enemy: 0 },
    { ally: 11, enemy: 0 },
    { ally: 1, enemy: -1 },
    { ally: 1.5, enemy: 1 },
  ])('味方 $ally, 敵 $enemy では用意しない', ({ ally, enemy }) => {
    expect(prepareTokens(createBattle(), ally, enemy)).toEqual(initial)
  })

  it('配置中・確定後には、もう一度用意しない', () => {
    const placing = prepareTokens(createBattle(), 1, 0)
    expect(prepareTokens(placing, 2, 2)).toBe(placing)
    const confirmed: BattleState = { ...placing, stage: 'confirmed' }
    expect(prepareTokens(confirmed, 2, 2)).toBe(confirmed)
  })

  it('一覧の駒を押すと選択し、同じ駒で解除、別の駒では選択だけ切り替える', () => {
    const placing = prepareTokens(createBattle(), 1, 1)
    const selected = tapToken(placing, 'ally-1')
    expect(selected).toEqual({ ...placing, selection: { kind: 'character', id: 'ally-1' } })
    expect(tapToken(selected, 'ally-1')).toEqual({ ...placing, selection: { kind: 'none' } })
    expect(tapToken(selected, 'enemy-1')).toEqual({ ...placing, selection: { kind: 'character', id: 'enemy-1' } })
    expect(tapToken({ ...placing, selection: { kind: 'cell', position: { x: 0, y: 0 } } }, 'enemy-1').selection)
      .toEqual({ kind: 'character', id: 'enemy-1' })
  })

  it('未配置の駒が1体でも残っていれば確定できない', () => {
    const placing = prepareTokens(createBattle(), 1, 1)
    const onePlaced: BattleState = {
      ...placing,
      characters: [{ ...token('ally', 1), position: { x: 0, y: 0 } }, token('enemy', 1)],
    }
    expect(canConfirm(onePlaced)).toBe(false)
    expect(confirmPlacement(onePlaced)).toBe(onePlaced)
  })

  it('全駒を置いても自動では確定せず、確定すると配置を引き継いで選択を解除する', () => {
    const allPlaced: BattleState = {
      stage: 'placing',
      characters: [
        { ...token('ally', 1), position: { x: 0, y: 0 } },
        { ...token('enemy', 1), position: { x: 1, y: 0 } },
      ],
      selection: { kind: 'character', id: 'ally-1' },
    }
    expect(canConfirm(allPlaced)).toBe(true)
    expect(confirmPlacement(allPlaced)).toEqual({
      stage: 'confirmed',
      characters: allPlaced.characters,
      selection: { kind: 'none' },
    })
  })

  it('数の指定・確定後の段階では確定できない', () => {
    expect(canConfirm(createBattle())).toBe(false)
    const confirmed: BattleState = { stage: 'confirmed', characters: [], selection: { kind: 'none' } }
    expect(canConfirm(confirmed)).toBe(false)
  })
})
