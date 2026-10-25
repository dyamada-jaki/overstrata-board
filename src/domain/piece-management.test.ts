import { addPieces, canConfirmAdditions, canEditMovement, confirmAdditions, confirmBattle, createInitialBattle, getAdditionCapacity, prepareBattle, removePiece, setMovement, type BattleState } from './preparation.ts'

const prepared = () => prepareBattle('1', '3')!
const placed = (state: BattleState): BattleState => ({ ...state, characters: state.characters.map((c, x) => ({ ...c, position: { x, y: 0 } })) })

describe('途中の増減の境界と状態（spec.md 2.2 / #33）', () => {
  it('敵3に2体追加し既存・選択を保つ。入力状態を書き換えず初期値5で未配置にする', () => {
    const state = Object.freeze({ ...setMovement(prepared(), 'enemy-1', 3), selection: { kind: 'character' as const, id: 'enemy-1' } })
    const next = addPieces(state, '0', ' 02 ')!
    expect(next).toMatchObject({ phase: 'preparing', selection: state.selection, issued: { ally: 1, enemy: 5 }, pendingIds: [] })
    expect(next.characters.slice(0, 4)).toEqual(state.characters)
    expect(next.characters.slice(4)).toEqual([4, 5].map((n) => ({ id: `enemy-${n}`, side: 'enemy', number: n, name: `敵${n}`, position: null, movement: 5 })))
    expect(state.characters).toHaveLength(4)
    expect(state).toMatchObject({ issued: { ally: 1, enemy: 3 } })
  })

  it('配置済みも未配置も同時上限へ数え、陣営別に残数を計算する', () => {
    const state = placed(prepareBattle('10', '8')!)
    expect(getAdditionCapacity(state, 'ally')).toBe(0)
    expect(getAdditionCapacity(state, 'enemy')).toBe(2)
    expect(addPieces(state, '1', '0')).toBeNull()
    expect(addPieces(state, '0', '3')).toBeNull()
    expect(addPieces(state, '0', '2')!.characters).toHaveLength(20)
  })

  it('現在8体/発行98は1体、99を削除しても再利用せず、他陣営には追加できる', () => {
    const state = { ...prepareBattle('0', '8')!, issued: { ally: 0, enemy: 98 } }
    expect(getAdditionCapacity(state, 'enemy')).toBe(1)
    expect(addPieces(state, '0', '2')).toBeNull()
    const next = addPieces(state, '0', '1')!
    expect(next.characters.at(-1)).toMatchObject({ id: 'enemy-99', name: '敵99', number: 99 })
    const removed = removePiece(next, 'enemy-99')
    expect(getAdditionCapacity(removed, 'enemy')).toBe(0)
    expect(getAdditionCapacity(removed, 'ally')).toBe(10)
    expect(addPieces(removed, '0', '1')).toBeNull()
    expect(addPieces(removed, '1', '0')!.characters.at(-1)).toMatchObject({ side: 'ally', number: 1 })
  })

  it.each([['0', '0'], ['', '1'], ['1', '1.5'], ['-1', '0'], ['0', '8'], ['３', '0']])('不正か追加0体（%s/%s）は増やさない', (ally, enemy) => {
    expect(addPieces(prepared(), ally, enemy)).toBeNull()
  })

  it('数指定の段階では追加・削除・追加確定・移動力変更をしない', () => {
    const state = createInitialBattle()
    expect(addPieces(state, '1', '0')).toBeNull()
    expect(removePiece(state, 'ally-1')).toBe(state)
    expect(canConfirmAdditions(state)).toBe(false)
    expect(confirmAdditions(state)).toBe(state)
    expect(canEditMovement(state, 'ally-1')).toBe(false)
  })

  it('削除は対象だけ、位置と移動力・番号を保持し選択解除。最後の番号も巻き戻さない', () => {
    const state = Object.freeze({ ...placed(prepared()), selection: { kind: 'character' as const, id: 'enemy-3' } })
    expect(removePiece(state, 'missing')).toBe(state)
    const next = removePiece(state, 'enemy-3')
    expect(next.characters).toEqual(state.characters.slice(0, 3))
    expect(next).toMatchObject({ phase: 'preparing', issued: { ally: 1, enemy: 3 }, selection: { kind: 'none' } })
    expect(addPieces(next, '0', '1')!.characters.at(-1)).toMatchObject({ number: 4 })
    expect(state.characters).toHaveLength(4)
  })

  it('追加分IDは追加/削除と同期し、既存の移動力は固定、再追加はまとめて確定する', () => {
    const active = confirmBattle(placed(prepared()))
    const added = addPieces(active, '1', '1')!
    expect(added).toMatchObject({ phase: 'active', pendingIds: ['ally-2', 'enemy-4'] })
    expect(canEditMovement(added, 'ally-1')).toBe(false)
    expect(canEditMovement(added, 'ally-2')).toBe(true)
    expect(canEditMovement(added, 'missing')).toBe(false)
    expect(setMovement(added, 'ally-1', 0)).toBe(added)
    expect(canConfirmAdditions(added)).toBe(false)
    expect(confirmAdditions(added)).toBe(added)
    const changed = placed(setMovement(added, 'ally-2', 0))
    expect(changed.characters.find((c) => c.id === 'ally-2')!.movement).toBe(0)
    expect(canConfirmAdditions(changed)).toBe(true)
    const more = addPieces(changed, '0', '1')!
    expect(more).toMatchObject({ pendingIds: ['ally-2', 'enemy-4', 'enemy-5'] })
    expect(canConfirmAdditions(more)).toBe(false)
    const removed = removePiece(more, 'enemy-4')
    expect(removed).toMatchObject({ pendingIds: ['ally-2', 'enemy-5'] })
    expect(removed.characters.some((c) => c.id === 'enemy-4')).toBe(false)
    const allPlaced = { ...placed(removed), selection: { kind: 'cell' as const, position: { x: 9, y: 9 } } }
    const confirmed = confirmAdditions(allPlaced)
    expect(confirmed).toEqual({ ...allPlaced, pendingIds: [], selection: { kind: 'none' } })
    expect(canEditMovement(confirmed, 'ally-2')).toBe(false)
    expect(setMovement(confirmed, 'ally-2', 3)).toBe(confirmed)
    expect(canConfirmAdditions(confirmed)).toBe(false)
    expect(confirmAdditions(confirmed)).toBe(confirmed)
  })

  it('未確定分を全削除すると追加準備終了、既存と発行番号は保持する', () => {
    const active = confirmBattle(placed(prepared()))
    const added = addPieces(active, '1', '0')!
    const removed = removePiece(added, 'ally-2')
    expect(removed).toEqual({ ...active, issued: { ally: 2, enemy: 3 }, pendingIds: [] })
    expect(canConfirmAdditions(removed)).toBe(false)
    expect(addPieces(removed, '1', '0')!.characters.at(-1)).toMatchObject({ number: 3 })
  })
})
