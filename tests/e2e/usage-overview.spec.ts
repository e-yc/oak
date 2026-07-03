import { test, expect } from './helpers/oak-app'
import { getStoreState, waitForSessionReady } from './helpers/store'

test.describe('usage overview', () => {
  test.beforeEach(async ({ oakPage }) => {
    await waitForSessionReady(oakPage)
  })

  test('Stats & Usage opens on the combined overview with provider controls', async ({
    oakPage
  }) => {
    await oakPage.evaluate(() => {
      const state = window.__store!.getState()
      state.openSettingsPage()
    })

    await expect
      .poll(async () => getStoreState<string>(oakPage, 'activeView'), { timeout: 5_000 })
      .toBe('settings')
    await oakPage.getByRole('button', { name: 'Stats & Usage' }).click()
    await expect(oakPage.getByRole('heading', { name: 'Usage Analytics' })).toBeVisible()
    const providerDropdown = oakPage.getByTestId('usage-provider-select')
    await expect(providerDropdown).toHaveAttribute(
      'aria-label',
      'Usage analytics provider: Overview'
    )
    await expect(oakPage.getByTestId('usage-overview-pane')).toBeVisible()
    await expect(oakPage.getByRole('heading', { name: 'Usage Overview' })).toBeVisible()
    await expect(oakPage.getByRole('heading', { name: 'Providers' })).toBeVisible()
    await expect(oakPage.getByRole('button', { name: 'Enable Claude' })).toBeVisible()
    await expect(oakPage.getByRole('button', { name: 'Enable Codex' })).toBeVisible()
    await expect(oakPage.getByRole('button', { name: 'Enable OpenCode' })).toBeVisible()

    await providerDropdown.click()
    await oakPage.getByRole('menuitem', { name: 'Codex', exact: true }).click()
    await expect(oakPage.getByRole('heading', { name: 'Codex Usage Tracking' })).toBeVisible()
    await expect(providerDropdown).toHaveAttribute('aria-label', 'Usage analytics provider: Codex')

    await providerDropdown.click()
    await oakPage.getByRole('menuitem', { name: 'OpenCode', exact: true }).click()
    await expect(oakPage.getByRole('heading', { name: 'OpenCode Usage Tracking' })).toBeVisible()
    await expect(providerDropdown).toHaveAttribute(
      'aria-label',
      'Usage analytics provider: OpenCode'
    )
  })
})
