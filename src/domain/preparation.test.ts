import { areBothCountsZero, stepTokenCount, canConfirmBattle, confirmBattle, createInitialBattle, parseCount, prepareBattle, setMovement, stepMovement } from './preparation.ts'
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
    expect(createInitialBattle()).toEqual({ phase: 'counts', characters: [], selection: { kind: 'none' }, issued: { ally: 0, enemy: 0 }, pendingIds: [] })
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
    expect(confirmBattle(selected)).toEqual({ phase: 'active', characters: placed.characters, selection: { kind: 'none' }, issued: { ally: 1, enemy: 0 }, pendingIds: [] })
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

describe('準備中の移動力の変更（#37）', () => {
  it.each([
    [0, -1, null], [0, 1, 1], [1, -1, 0], [5, -1, 4], [5, 1, 6], [8, 1, 9], [9, 1, null], [9, -1, 8],
  ] as const)('%dを%dすると%s', (movement, delta, expected) => {
    expect(stepMovement(movement, delta)).toBe(expected)
  })

  it('対象の駒だけを書き換え、選択・位置・段階は保ち、元の状態を変更しない', () => {
    const prepared = prepareBattle('2', '1')!
    const state = Object.freeze({ ...prepared, selection: { kind: 'character' as const, id: 'ally-2' } })
    const next = setMovement(state, 'ally-2', 9)
    expect(next.characters.map((character) => [character.id, character.movement])).toEqual([['ally-1', 5], ['ally-2', 9], ['enemy-1', 5]])
    expect(next.selection).toEqual(state.selection)
    expect(next.phase).toBe('preparing')
    expect(next.characters[1]).toEqual({ ...state.characters[1], movement: 9 })
    expect(state.characters[1]!.movement).toBe(5)
    expect(setMovement(state, 'ally-1', 0).characters.map((character) => character.movement)).toEqual([0, 5, 5])
  })

  it.each([-1, 10, 1.5])('%sは設定せず、状態を変えない', (movement) => {
    const state = prepareBattle('1', '0')!
    expect(setMovement(state, 'ally-1', movement)).toBe(state)
  })

  it('確定後・数指定の段階・存在しない駒では状態を変えない', () => {
    const state = prepareBattle('1', '0')!
    const active = { ...state, phase: 'active' as const }
    expect(setMovement(active, 'ally-1', 3)).toBe(active)
    const counts = createInitialBattle()
    expect(setMovement(counts, 'ally-1', 3)).toBe(counts)
    expect(setMovement(state, 'enemy-1', 3)).toBe(state)
  })
})
