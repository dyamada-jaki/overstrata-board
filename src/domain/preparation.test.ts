import { areBothCountsZero, stepTokenCount, canConfirmAdditions, canConfirmBattle, confirmAdditions, confirmBattle, createInitialBattle, deleteCharacter, getAddableCount, parseCount, prepareAdditions, prepareBattle, setMovement, stepMovement, type BattleState } from './preparation.ts'
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
    // #33: 番号の発行状況も初期化して持つ。
    expect(createInitialBattle()).toEqual({ phase: 'counts', characters: [], selection: { kind: 'none' }, issued: { ally: 0, enemy: 0 } })
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
    // #33: 確定で全駒を確定済みにする。位置と発行状況は引き継ぐ。
    expect(confirmBattle(selected)).toEqual({
      phase: 'active',
      characters: placed.characters.map((character) => ({ ...character, confirmed: true })),
      selection: { kind: 'none' },
      issued: { ally: 1, enemy: 0 },
    })
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
    // #33 から変更できるかは駒の確定で決まるため、実際の確定を通した戦闘中の状態を使う。
    const active = confirmBattle({ ...state, ...tapPosition({ ...state, selection: { kind: 'character', id: 'ally-1' } }, { x: 0, y: 0 }, size) })
    expect(active.phase).toBe('active')
    expect(setMovement(active, 'ally-1', 3)).toBe(active)
    const counts = createInitialBattle()
    expect(setMovement(counts, 'ally-1', 3)).toBe(counts)
    expect(setMovement(state, 'enemy-1', 3)).toBe(state)
  })
})

// #33 の途中の追加・削除。spec.md 2.2 の例と、同時数の上限・番号の上限の境界を確かめる。
const limits = { perSide: 10, maxNumber: 99 }
const names = (state: BattleState) => state.characters.map((character) => character.name)
function placeAll(state: BattleState): BattleState {
  return state.characters.reduce<BattleState>((current, character, index) => character.position !== null ? current : {
    ...current,
    ...tapPosition({ ...current, selection: { kind: 'character', id: character.id } }, { x: index % 10, y: Math.floor(index / 10) }, size),
  }, state)
}
const activeOf = (ally: string, enemy: string) => confirmBattle(placeAll(prepareBattle(ally, enemy)!))
/** 発行済み番号と現在数を指定した状態（削除を繰り返した結果と同じ形）。 */
function issuedState(side: 'ally' | 'enemy', current: number, issued: number): BattleState {
  const characters = Array.from({ length: current }, (_, index) => {
    const number = issued - index
    return { id: `${side}-${number}`, name: `${side === 'ally' ? '味方' : '敵'}${number}`, side, number, movement: 5, position: null, confirmed: false }
  })
  return { phase: 'preparing', characters, selection: { kind: 'none' }, issued: { ally: 0, enemy: 0, [side]: issued } }
}

describe('上限を渡す数の解釈（#33）', () => {
  it.each([['4', 4, 4], ['5', 4, null], ['0', 0, 0], ['1', 0, null], ['10', 10, 10], ['11', 11, 11]] as const)('「%s」は上限%dで%s', (input, max, expected) => {
    expect(parseCount(input, max)).toBe(expected)
  })
  it('上限を省略すると共通の同時数の上限を使う', () => {
    expect(parseCount(String(limits.perSide))).toBe(limits.perSide)
    expect(parseCount(String(limits.perSide + 1))).toBeNull()
  })
  it.each([['3', 1, 3, null], ['2', 1, 3, 3], ['0', 1, 0, null], ['0', -1, 0, null], ['4', -1, 3, null]] as const)('「%s」を%dすると上限%dで%s', (input, delta, max, expected) => {
    expect(stepTokenCount(input, delta, max)).toBe(expected)
  })
})

describe('追加できる数（同時数の残り枠と99番までの残り番号の少ない方）', () => {
  it.each([
    ['ally', 0, 0, 10], ['enemy', 3, 3, 7], ['enemy', 10, 10, 0], ['enemy', 8, 98, 1], ['enemy', 9, 99, 0],
    ['enemy', 3, 95, 4], ['enemy', 8, 50, 2], ['enemy', 0, 99, 0], ['enemy', 1, 92, 7], ['enemy', 1, 91, 8],
  ] as const)('%s が現在%d体・発行済み%dなら%d体', (side, current, issued, expected) => {
    expect(getAddableCount(issuedState(side, current, issued), side)).toBe(expected)
  })
  it('もう一方の陣営は自身の上限で決まる', () => {
    const state = issuedState('enemy', 9, 99)
    expect(getAddableCount(state, 'enemy')).toBe(0)
    expect(getAddableCount(state, 'ally')).toBe(10)
  })
})

describe('途中の追加（#33）', () => {
  it('敵3体に敵2体を追加すると敵5体。既存の駒・選択・段階は保ち、追加分は未配置・移動力5', () => {
    const active = Object.freeze({ ...activeOf('0', '3'), selection: { kind: 'character' as const, id: 'enemy-2' } })
    const next = prepareAdditions(active, '0', '2')!
    expect(names(next)).toEqual(['敵1', '敵2', '敵3', '敵4', '敵5'])
    expect(next.characters.slice(0, 3)).toEqual(active.characters)
    expect(next.characters.slice(3)).toEqual([
      { id: 'enemy-4', name: '敵4', side: 'enemy', number: 4, movement: 5, position: null, confirmed: false },
      { id: 'enemy-5', name: '敵5', side: 'enemy', number: 5, movement: 5, position: null, confirmed: false },
    ])
    expect(next.phase).toBe('active')
    expect(next.selection).toEqual(active.selection)
    expect(next.issued).toEqual({ ally: 0, enemy: 5 })
    expect(active.characters).toHaveLength(3)
  })
  it('準備中の追加も未配置・未確定で、味方・敵を同時に追加できる', () => {
    const next = prepareAdditions(prepareBattle('1', '1')!, ' 2 ', '01')!
    expect(names(next)).toEqual(['味方1', '敵1', '味方2', '味方3', '敵2'])
    expect(next.phase).toBe('preparing')
    expect(next.characters.every((character) => !character.confirmed && character.position === null)).toBe(true)
    expect(canConfirmBattle(next)).toBe(false)
  })
  it.each([['0', '0'], ['', '1'], ['1', '-1'], ['1', '1.5'], ['0', '８'], ['0', '8'], ['11', '0']])('味方%s/敵%sは追加できない（敵3体・味方0体）', (ally, enemy) => {
    expect(prepareAdditions(activeOf('0', '3'), ally, enemy)).toBeNull()
  })
  it('追加可能数ちょうどなら追加でき、1つ超えると追加できない', () => {
    expect(names(prepareAdditions(activeOf('0', '3'), '10', '7')!)).toHaveLength(20)
    expect(prepareAdditions(activeOf('0', '3'), '10', '8')).toBeNull()
  })
  it('現在8体・発行済み98なら99番の1体だけ追加でき、その後は現在9体でも追加できない', () => {
    const state = issuedState('enemy', 8, 98)
    expect(prepareAdditions(state, '0', '2')).toBeNull()
    const next = prepareAdditions(state, '0', '1')!
    expect(next.characters.at(-1)).toMatchObject({ id: 'enemy-99', name: '敵99', number: 99 })
    expect(getAddableCount(next, 'enemy')).toBe(0)
    expect(prepareAdditions(next, '0', '1')).toBeNull()
    const deleted = deleteCharacter(next, 'enemy-99')
    expect(getAddableCount(deleted, 'enemy')).toBe(0)
    expect(names(prepareAdditions(deleted, '1', '0')!).at(-1)).toBe('味方1')
  })
  it('数指定の段階では追加しない', () => {
    expect(prepareAdditions(createInitialBattle(), '1', '0')).toBeNull()
  })
})

describe('削除と番号（#33）', () => {
  it('敵2を削除して追加すると敵4。選択・範囲を解除し、他の駒・段階・発行状況は保つ', () => {
    const active = Object.freeze({ ...activeOf('1', '3'), selection: { kind: 'character' as const, id: 'enemy-2' } })
    const deleted = deleteCharacter(active, 'enemy-2')
    expect(names(deleted)).toEqual(['味方1', '敵1', '敵3'])
    expect(deleted.characters).toEqual(active.characters.filter((character) => character.id !== 'enemy-2'))
    expect(deleted.selection).toEqual({ kind: 'none' })
    expect(deleted.phase).toBe('active')
    expect(deleted.issued).toEqual({ ally: 1, enemy: 3 })
    expect(getSelectedMovementRange(deleted, size)).toEqual([])
    expect(names(prepareAdditions(deleted, '0', '1')!).at(-1)).toBe('敵4')
    expect(active.characters).toHaveLength(4)
  })
  it('最後に発行した敵3を削除しても次は敵4', () => {
    const deleted = deleteCharacter(prepareBattle('0', '3')!, 'enemy-3')
    expect(names(prepareAdditions(deleted, '0', '1')!)).toEqual(['敵1', '敵2', '敵4'])
  })
  it('全駒を削除しても段階と発行状況を保ち、準備中は確定できない', () => {
    const preparing = ['ally-1', 'enemy-1'].reduce(deleteCharacter, prepareBattle('1', '1')!)
    expect(preparing).toEqual({ phase: 'preparing', characters: [], selection: { kind: 'none' }, issued: { ally: 1, enemy: 1 } })
    expect(canConfirmBattle(preparing)).toBe(false)
    const active = deleteCharacter(activeOf('1', '0'), 'ally-1')
    expect(active).toEqual({ phase: 'active', characters: [], selection: { kind: 'none' }, issued: { ally: 1, enemy: 0 } })
  })
  it('存在しない駒では状態を変えない', () => {
    const state = prepareBattle('1', '0')!
    expect(deleteCharacter(state, 'enemy-1')).toBe(state)
  })
  it('全体のクリア（初期状態）では発行状況も戻り、1番から始まる', () => {
    expect(names(prepareBattle('1', '2')!)).toEqual(['味方1', '敵1', '敵2'])
    expect(prepareBattle('1', '2')!.issued).toEqual({ ally: 1, enemy: 2 })
  })
})

describe('戦闘中の追加分の移動力と確定（#33）', () => {
  it('追加分だけ移動力を変えられ、確定済みの駒は変えられない', () => {
    const added = prepareAdditions(activeOf('1', '0'), '0', '1')!
    expect(setMovement(added, 'ally-1', 3)).toBe(added)
    expect(setMovement(added, 'enemy-1', 3).characters.map((character) => character.movement)).toEqual([5, 3])
  })
  it('未配置の追加分が残る間は確定できず、すべて配置すると確定できる。置いただけでは確定しない', () => {
    const added = prepareAdditions(activeOf('1', '0'), '0', '2')!
    expect(canConfirmAdditions(added)).toBe(false)
    expect(confirmAdditions(added)).toBe(added)
    const placed = placeAll(added)
    expect(placed.characters.every((character) => character.position !== null)).toBe(true)
    expect(placed.characters.filter((character) => !character.confirmed).map((character) => character.id)).toEqual(['enemy-1', 'enemy-2'])
    expect(canConfirmAdditions(placed)).toBe(true)
    const selected = Object.freeze({ ...setMovement(placed, 'enemy-2', 8), selection: { kind: 'character' as const, id: 'enemy-2' } })
    const confirmed = confirmAdditions(selected)
    expect(confirmed.selection).toEqual({ kind: 'none' })
    expect(confirmed.phase).toBe('active')
    expect(confirmed.characters).toEqual(selected.characters.map((character) => ({ ...character, confirmed: true })))
    expect(confirmed.characters.map((character) => character.movement)).toEqual([5, 5, 8])
    expect(setMovement(confirmed, 'enemy-2', 3)).toBe(confirmed)
    expect(canConfirmAdditions(confirmed)).toBe(false)
  })
  it('未確定の追加分をすべて削除すると確定の対象がなくなり、戦闘中のまま', () => {
    const added = placeAll(prepareAdditions(activeOf('1', '0'), '0', '1')!)
    const deleted = deleteCharacter(added, 'enemy-1')
    expect(canConfirmAdditions(deleted)).toBe(false)
    expect(deleted.phase).toBe('active')
    expect(deleted.characters).toEqual(activeOf('1', '0').characters)
  })
  it('準備中・確定済みだけの戦闘中・数指定の段階では追加分の確定はできない', () => {
    const preparing = placeAll(prepareBattle('1', '0')!)
    expect(canConfirmAdditions(preparing)).toBe(false)
    expect(confirmAdditions(preparing)).toBe(preparing)
    expect(canConfirmAdditions(activeOf('1', '0'))).toBe(false)
    expect(canConfirmAdditions(createInitialBattle())).toBe(false)
  })
})
