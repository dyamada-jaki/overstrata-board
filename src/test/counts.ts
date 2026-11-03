import { fireEvent, screen, within } from '@testing-library/react'

// #46: 駒数は表示専用の数値と「−」「＋」だけで指定する（spec.md 2.2）。テストも利用者と同じくボタンで数を変える。

/** 「味方の数」「敵の追加数」などの表示専用の数値。 */
export const countValue = (name: string) => within(screen.getByRole('group', { name })).getByRole('status')

/** 表示中の数。「10」に「0」が含まれるような部分一致を避けるため、文字列全体で比べる。 */
export const countText = (name: string) => countValue(name).textContent

/** 「−」「＋」を1回ずつ押して目標の数にする。押せないボタンで届かなければ失敗する。 */
export function setCount(name: string, target: number) {
  for (let step = 0; step <= 20; step += 1) {
    const current = Number(countText(name))
    if (current === target) return
    fireEvent.click(screen.getByRole('button', { name: `${name}を${current < target ? '増やす' : '減らす'}` }))
  }
  throw new Error(`${name}を${target}にできません（現在 ${countText(name)}）`)
}
