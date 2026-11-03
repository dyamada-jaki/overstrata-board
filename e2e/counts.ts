import { expect, type Page } from '@playwright/test'

export async function setCount(page: Page, name: string, value: string) {
  const current = Number(await page.getByRole('status', { name, exact: true }).textContent())
  const target = Number(value)
  for (let i = 0; i < Math.abs(target - current); i += 1) {
    await page.getByRole('button', { name: `${name}を${target < current ? '減らす' : '増やす'}` }).click()
  }
  await expect(page.getByRole('status', { name, exact: true })).toHaveText(String(target))
}
