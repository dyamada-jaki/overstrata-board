import { changeMovement, areBothCountsZero, stepTokenCount, canConfirmBattle, confirmBattle, createInitialBattle, parseCount, prepareBattle } from './preparation.ts'
import { getSelectedMovementRange, tapPosition } from './selection.ts'

const size = { width: 10, height: 10 }

describe('承認された数の入力の解釈', () => {
  it.each([['0', 0], ['1', 1], ['9', 9], ['10', 10], ['05', 5], [' 3 ', 3], ['\t10\n', 10]])('「%s」は%d体', (input, count) => {
    expect(parseCount(input)).toBe(count)
  })
  it.each(['', ' ', '-1', '1.5', '11', '100', 'a', '３', '1e1', '+1', '3 3', 'Infinity'])('「%s」は不正', (input) => {
    expect(parseCount(input)).toBeNull()
  })
})

describe('戦闘準備の入口', () => {
  it('初期状態は数指定・0体・未選択', () => {
    expect(createInitialBattle()).toEqual({ phase: 'counts', characters: [], selection: { kind: 'none' } })
  })
  it.each([['0', '0'], ['11', '1'], ['1', '-1'], ['', '1']])('味方%s/敵%sは準備できない', (ally, enemy) => {
    expect(prepareBattle(ally, enemy)).toBeNull()
  })
  it.each([['1', '0', 1], ['0', '1', 1], ['10', '10', 20]])('味方%s/敵%sは%d体を未配置・移動力5で作る', (ally, enemy, count) => {
    const state = prepareBattle(ally, enemy)!
    expect(state.phase).toBe('preparing')
    expect(state.selection).toEqual({ kind: 'none' })
    expect(state.characters).toHaveLength(count)
    expect(new Set(state.characters.map((character) => character.id)).size).toBe(count)
    for (const character of state.characters) {
      expect(character).toMatchObject({ position: null, movement: 5 })
    }
    if (count === 20) {
      expect(state.characters[9]).toMatchObject({ side: 'ally', number: 10, name: '味方10' })
      expect(state.characters[19]).toMatchObject({ side: 'enemy', number: 10, name: '敵10' })
    }
    expect(canConfirmBattle(state)).toBe(false)
    expect(confirmBattle(state)).toEqual(state)
  })
  it('0体や未配置では確定できず、全配置で確定した時だけ選択を解除して位置を保つ', () => {
    const initial = createInitialBattle()
    expect(canConfirmBattle(initial)).toBe(false)
    expect(confirmBattle(initial)).toEqual(initial)
    const emptyPreparation = { ...initial, phase: 'preparing' as const }
    expect(canConfirmBattle(emptyPreparation)).toBe(false)
    expect(confirmBattle(emptyPreparation)).toEqual(emptyPreparation)
    const state = prepareBattle('1', '0')!
    const placed = { ...state, ...tapPosition({ ...state, selection: { kind: 'character', id: state.characters[0]!.id } }, { x: 2, y: 3 }, size) }
    expect(canConfirmBattle(placed)).toBe(true)
    const selected = Object.freeze({ ...placed, selection: { kind: 'cell' as const, position: { x: 0, y: 0 } } })
    expect(confirmBattle(selected)).toEqual({ phase: 'active', characters: placed.characters, selection: { kind: 'none' } })
    expect(selected.selection.kind).toBe('cell')
    const active = { ...confirmBattle(selected), selection: { kind: 'character' as const, id: state.characters[0]!.id } }
    expect(canConfirmBattle(active)).toBe(false)
    expect(confirmBattle(active)).toEqual(active)
  })
  it('未配置選択中は範囲を出さず、盤面外への配置では入力状態を変更しない', () => {
    const state = prepareBattle('1', '0')!
    const selected = Object.freeze({ ...state, selection: { kind: 'character' as const, id: state.characters[0]!.id } })
    expect(getSelectedMovementRange(selected, size)).toEqual([])
    expect(tapPosition(selected, { x: 10, y: 0 }, size)).toEqual(selected)
    expect(tapPosition(selected, { x: -1, y: 0 }, size)).toEqual(selected)
    const placed = tapPosition(selected, { x: 0, y: 0 }, size)
    expect(placed.characters[0]!.position).toEqual({ x: 0, y: 0 })
    expect(selected.characters[0]!.position).toBeNull()
  })
})

describe('数の操作と双方0体の案内', () => {
  it.each([
    ['0', -1, null], ['0', 1, 1], ['1', -1, 0], ['9', 1, 10],
    ['10', 1, null], ['10', -1, 9], [' 05 ', -1, 4],
    ['', 1, null], ['11', -1, null], ['-1', 1, null], ['1.5', -1, null],
  ] as const)('「%s」を%dすると%s', (input, delta, expected) => {
    expect(stepTokenCount(input, delta)).toBe(expected)
  })
  it.each([
    ['0', '0', true], [' 00 ', '0', true], ['1', '0', false], ['0', '1', false],
    ['10', '10', false], ['', '0', false], ['0', '11', false],
  ])('味方%s/敵%sの双方0体案内は%s', (ally, enemy, expected) => {
    expect(areBothCountsZero(ally, enemy)).toBe(expected)
  })
})

describe('駒の移動力の変更', () => {
  it.each([
    [0, -1, 0], [0, 1, 1], [1, -1, 0], [5, -1, 4], [5, 1, 6],
    [8, 1, 9], [9, -1, 8], [9, 1, 9],
  ] as const)('移動力%dを%dすると%dになり、選択・配置・他の駒・入力は変えない', (movement, delta, expected) => {
    const prepared = prepareBattle('2', '1')!
    const state = {
      ...prepared,
      selection: { kind: 'character' as const, id: 'ally-1' },
      characters: prepared.characters.map((character, index) => Object.freeze({
        ...character, movement: index === 0 ? movement : 5,
        position: index === 0 ? { x: 2, y: 3 } : null,
      })),
    }
    Object.freeze(state.characters)
    Object.freeze(state)
    const before = structuredClone(state)
    expect(changeMovement(state, 'ally-1', delta)).toEqual({
      ...state, characters: state.characters.map((character, index) => index === 0 ? { ...character, movement: expected } : character),
    })
    expect(state).toEqual(before)
  })

  it('未配置の敵の移動力も変更できる', () => {
    const state = prepareBattle('1', '1')!
    expect(changeMovement(state, 'enemy-1', 1)).toEqual({
      ...state, characters: [state.characters[0], { ...state.characters[1], movement: 6 }],
    })
  })

  it.each(['counts', 'active'] as const)('%sでは変更せず、知らない駒も増やさない', (phase) => {
    const state = { ...prepareBattle('1', '1')!, phase }
    expect(changeMovement(state, 'ally-1', 1)).toEqual(state)
    expect(changeMovement(state, 'missing', -1)).toEqual(state)
  })

  it('準備中でも知らない駒は変更せず、確定には変更した値を引き継ぐ', () => {
    const state = prepareBattle('1', '0')!
    expect(changeMovement(state, 'missing', -1)).toEqual(state)
    const edited = changeMovement(state, 'ally-1', -1)
    const placed = { ...edited, ...tapPosition({ ...edited, selection: { kind: 'character' as const, id: 'ally-1' } }, { x: 0, y: 0 }, size) }
    const active = confirmBattle(placed)
    expect(active.characters[0]).toMatchObject({ movement: 4, position: { x: 0, y: 0 } })
    expect(changeMovement(active, 'ally-1', 1)).toEqual(active)
  })
})
