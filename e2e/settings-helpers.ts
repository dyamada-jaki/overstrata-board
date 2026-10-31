import type { Page } from '@playwright/test'

export async function openSettings(page: Page) {
  if (!(await page.getByRole('dialog', { name: /の設定$/ }).count())) {
    await page.getByRole('button', { name: '設定', exact: true }).click()
  }
}

export async function closeSettings(page: Page) {
  const close = page.getByRole('button', { name: '設定を閉じる' })
  if (await close.count()) await close.click()
}
