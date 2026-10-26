import { addPieces, confirmAdditions, confirmBattle, prepareBattle, removePiece, toggleDowned, type BattleState } from './preparation.ts'
import { getSelectedMovementRange, tapPosition, type BoardState } from './selection.ts'

const size = { width: 10, height: 10 }
// 味方1 (2, 2)・味方2 未配置・敵1 (5, 5)。内部座標。
function battle(): BattleState {
  const prepared = prepareBattle('2', '1')!
  return Object.freeze({
    ...prepared,
    characters: Object.freeze(prepared.characters.map((c) => c.id === 'ally-1' ? { ...c, position: { x: 1, y: 1 } }
      : c.id === 'enemy-1' ? { ...c, position: { x: 4, y: 4 } } : c)),
  })
}
const select = (state: BattleState, id: string): BattleState => Object.freeze({ ...state, selection: { kind: 'character' as const, id } })
const find = (state: BoardState, id: string) => state.characters.find((c) => c.id === id)!

describe('倒れた状態の切り替え（spec.md 2.2 / #34）', () => {
  it('対象の駒だけを反転し、位置・移動力・選択・段階・番号の発行・他の駒を保つ。入力を書き換えない', () => {
    const state = select(battle(), 'ally-1')
    const downed = toggleDowned(state, 'ally-1')
    expect(downed.characters).toEqual(state.characters.map((c) => c.id === 'ally-1' ? { ...c, downed: true } : c))
    expect(downed).toMatchObject({ selection: state.selection, phase: state.phase, issued: state.issued, pendingIds: state.pendingIds })
    expect(find(state, 'ally-1').downed).toBe(false)
    const restored = toggleDowned(downed, 'ally-1')
    expect(restored.characters).toEqual(state.characters)
  })

  it('未配置の駒も切り替えられ、存在しない id では何も変えない', () => {
    const state = battle()
    expect(find(toggleDowned(state, 'ally-2'), 'ally-2')).toMatchObject({ downed: true, position: null })
    expect(toggleDowned(state, 'ally-9')).toEqual(state)
  })

  it('新しく用意・追加する駒は通常で始まり、確定・追加・削除で他の駒の状態を保つ', () => {
    const state = toggleDowned({ ...battle(), characters: battle().characters.map((c) => ({ ...c, position: c.position ?? { x: 9, y: 9 } })) }, 'ally-1')
    expect(prepareBattle('1', '1')!.characters.map((c) => c.downed)).toEqual([false, false])
    const active = confirmBattle(state)
    expect(find(active, 'ally-1').downed).toBe(true)
    const added = addPieces(active, '0', '1')!
    expect(find(added, 'enemy-2').downed).toBe(false)
    expect(find(added, 'ally-1').downed).toBe(true)
    const removed = removePiece(added, 'enemy-2')
    expect(find(removed, 'ally-1').downed).toBe(true)
    const addedDowned = toggleDowned(addPieces(removed, '0', '1')!, 'enemy-3')
    const confirmed = confirmAdditions({ ...addedDowned, characters: addedDowned.characters.map((c) => c.id === 'enemy-3' ? { ...c, position: { x: 0, y: 9 } } : c) })
    expect(confirmed.pendingIds).toEqual([])
    expect(confirmed.characters.filter((c) => c.downed).map((c) => c.id)).toEqual(['ally-1', 'enemy-3'])
  })
})

describe('倒れた駒の移動範囲の目安（spec.md 2.3 / #50）', () => {
  it('配置済みで倒れた駒は選択中でも目安を出さず、通常に戻すと同じ位置・移動力の目安に戻る', () => {
    const state = select(battle(), 'ally-1')
    const normal = getSelectedMovementRange(state, size)
    expect(normal).toContainEqual({ x: 2, y: 1 })
    const downed = toggleDowned(state, 'ally-1')
    expect(getSelectedMovementRange(downed, size)).toEqual([])
    expect(getSelectedMovementRange(toggleDowned(downed, 'ally-1'), size)).toEqual(normal)
  })

  it('未配置の駒は通常・倒れた状態とも目安を出さない', () => {
    const state = select(battle(), 'ally-2')
    expect(getSelectedMovementRange(state, size)).toEqual([])
    expect(getSelectedMovementRange(toggleDowned(state, 'ally-2'), size)).toEqual([])
  })

  it('倒れた駒も占有に数え、隣の通常の駒の目安から倒れた駒のマスを除いたままにする', () => {
    // 味方1 を敵1 (5, 5) の隣 (5, 4) へ置く。内部座標。
    const base = battle()
    const near: BattleState = { ...base, characters: base.characters.map((c) => c.id === 'ally-1' ? { ...c, position: { x: 4, y: 3 } } : c) }
    const enemy = select(near, 'enemy-1')
    const normal = getSelectedMovementRange(enemy, size)
    expect(normal).not.toContainEqual({ x: 4, y: 3 })
    expect(getSelectedMovementRange(toggleDowned(enemy, 'ally-1'), size)).toEqual(normal)
  })
})

describe('倒れた駒の移動（spec.md 2.3 / #34）', () => {
  // 味方1 (2, 2) の移動力5: (3, 2) は範囲内、(10, 10) は範囲外、(1, 1) は盤面の角。
  it.each([[{ x: 2, y: 1 }, '範囲内'], [{ x: 9, y: 9 }, '範囲外'], [{ x: 0, y: 0 }, '盤面の角']])('配置済みで倒れた駒は空きマス %o（%s）へ動かず、選択も保つ', (position) => {
    const state = toggleDowned(select(battle(), 'ally-1'), 'ally-1')
    expect(tapPosition(state, position, size)).toEqual(state)
  })

  it('倒れた駒を選択中でも、同じ駒で解除・別の駒へ切り替えはできる', () => {
    const state = toggleDowned(select(battle(), 'ally-1'), 'ally-1')
    expect(tapPosition(state, { x: 1, y: 1 }, size).selection).toEqual({ kind: 'none' })
    const switched = tapPosition(state, { x: 4, y: 4 }, size)
    expect(switched).toEqual({ characters: state.characters, selection: { kind: 'character', id: 'enemy-1' } })
  })

  it('未配置で倒れた駒は空きマスへ初回配置でき、状態を引き継いで選択を解除する', () => {
    const state = toggleDowned(select(battle(), 'ally-2'), 'ally-2')
    const next: BattleState = { ...state, ...tapPosition(state, { x: 9, y: 9 }, size) }
    expect(find(next, 'ally-2')).toMatchObject({ position: { x: 9, y: 9 }, downed: true })
    expect(next.selection).toEqual({ kind: 'none' })
    const reselected = select(next, 'ally-2')
    expect(tapPosition(reselected, { x: 8, y: 9 }, size)).toEqual(reselected)
  })

  it('通常に戻すと範囲外の空きマスへも動ける。倒れた駒のマスには他の駒を置けない', () => {
    const restored = toggleDowned(toggleDowned(select(battle(), 'ally-1'), 'ally-1'), 'ally-1')
    expect(find(tapPosition(restored, { x: 9, y: 9 }, size), 'ally-1').position).toEqual({ x: 9, y: 9 })
    const enemySelected = select(toggleDowned(battle(), 'ally-1'), 'enemy-1')
    const tapped = tapPosition(enemySelected, { x: 1, y: 1 }, size)
    expect(find(tapped, 'enemy-1').position).toEqual({ x: 4, y: 4 })
    expect(tapped.selection).toEqual({ kind: 'character', id: 'ally-1' })
  })
})
