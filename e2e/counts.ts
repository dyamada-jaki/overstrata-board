import { expect, type Page } from '@playwright/test'

// #46: 駒数は表示専用の数値と「−」「＋」だけで指定する（spec.md 2.2）。E2E も利用者と同じくボタンで数を変える。

/** 「味方の数」「敵の追加数」などの表示専用の数値。 */
export const countValue = (page: Page, name: string) => page.getByRole('group', { name, exact: true }).getByRole('status')

/** 「−」「＋」を1回ずつ押して目標の数にする。押した結果の表示を待ってから次を押す。 */
export async function setCount(page: Page, name: string, target: number) {
  const value = countValue(page, name)
  for (let step = 0; step <= 20; step += 1) {
    const current = Number(await value.textContent())
    if (current === target) return
    await page.getByRole('button', { name: `${name}を${current < target ? '増やす' : '減らす'}`, exact: true }).click()
    await expect(value).toHaveText(String(current < target ? current + 1 : current - 1))
  }
  throw new Error(`${name}を${target}にできません`)
}
