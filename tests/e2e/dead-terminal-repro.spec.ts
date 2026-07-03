/**
 * Stress test for dead-terminal reproduction (setup-split flow).
 *
 * Why @headful: the dead-terminal bug is a WebGL canvas staleness issue — after
 * wrapInSplit() reparents the existing pane's container, the WebGL canvas can
 * fail to repaint. In headless mode WebGL is NEVER active, so the DOM fallback
 * renderer is used and the bug cannot manifest. Running headful ensures real
 * WebGL contexts matching production.
 *
 * See helpers/dead-terminal.ts for the shared worktree-creation helper that
 * replicates the exact activateAndRevealWorktree + ensureWorktreeHasInitialTerminal
 * production flow.
 */

import { test, expect } from './helpers/oak-app'
import {
  waitForSessionReady,
  waitForActiveWorktree,
  getActiveWorktreeId,
  switchToWorktree,
  ensureTerminalVisible
} from './helpers/store'
import { waitForActiveTerminalManager, waitForPaneCount } from './helpers/terminal'
import {
  createAndActivateWorktreeWithSetup,
  removeWorktreeViaStore,
  waitForAllPanesToHaveContent,
  checkWebglState
} from './helpers/dead-terminal'

const STRESS_ITERATIONS = 5

test.describe('Dead Terminal Reproduction @headful', () => {
  const createdWorktreeIds: string[] = []

  test.beforeEach(async ({ oakPage }) => {
    await waitForSessionReady(oakPage)
    await waitForActiveWorktree(oakPage)
    await ensureTerminalVisible(oakPage)

    await oakPage.evaluate(async () => {
      const state = window.__store?.getState()
      if (!state) {
        return
      }
      state.updateSettings({ setupScriptLaunchMode: 'split-vertical' })
    })
  })

  test.afterEach(async ({ oakPage }) => {
    for (const id of createdWorktreeIds) {
      await removeWorktreeViaStore(oakPage, id)
    }
    createdWorktreeIds.length = 0
  })

  test('@headful setup-split flow does not produce dead terminals', async ({ oakPage }) => {
    test.setTimeout(120_000)
    const homeWorktreeId = await waitForActiveWorktree(oakPage)
    await waitForActiveTerminalManager(oakPage, 30_000)
    await checkWebglState(oakPage, 'home-initial')

    for (let i = 0; i < STRESS_ITERATIONS; i++) {
      const direction = i % 2 === 0 ? 'vertical' : 'horizontal'
      const newId = await createAndActivateWorktreeWithSetup(oakPage, `setup-${i}`, direction)
      createdWorktreeIds.push(newId)

      await expect.poll(async () => getActiveWorktreeId(oakPage), { timeout: 10_000 }).toBe(newId)
      await ensureTerminalVisible(oakPage)
      await waitForActiveTerminalManager(oakPage, 30_000)
      await waitForPaneCount(oakPage, 2, 15_000)
      await checkWebglState(oakPage, `setup-${i}`)
      await waitForAllPanesToHaveContent(oakPage, `setup-${i} both panes`)

      await switchToWorktree(oakPage, homeWorktreeId)
      await expect
        .poll(async () => getActiveWorktreeId(oakPage), { timeout: 10_000 })
        .toBe(homeWorktreeId)
      await removeWorktreeViaStore(oakPage, newId)
      createdWorktreeIds.pop()
    }
  })

  test('@headful setup-split then switch-back does not leave panes dead', async ({ oakPage }) => {
    test.setTimeout(120_000)
    const homeWorktreeId = await waitForActiveWorktree(oakPage)
    await waitForActiveTerminalManager(oakPage, 30_000)

    for (let i = 0; i < STRESS_ITERATIONS; i++) {
      const newId = await createAndActivateWorktreeWithSetup(oakPage, `switchback-${i}`, 'vertical')
      createdWorktreeIds.push(newId)

      await expect.poll(async () => getActiveWorktreeId(oakPage), { timeout: 10_000 }).toBe(newId)
      await ensureTerminalVisible(oakPage)
      await waitForActiveTerminalManager(oakPage, 30_000)
      await waitForPaneCount(oakPage, 2, 15_000)
      await waitForAllPanesToHaveContent(oakPage, `switchback-${i} initial`)

      await switchToWorktree(oakPage, homeWorktreeId)
      await expect
        .poll(async () => getActiveWorktreeId(oakPage), { timeout: 10_000 })
        .toBe(homeWorktreeId)
      await ensureTerminalVisible(oakPage)
      await waitForActiveTerminalManager(oakPage, 15_000)

      await switchToWorktree(oakPage, newId)
      await expect.poll(async () => getActiveWorktreeId(oakPage), { timeout: 10_000 }).toBe(newId)
      await ensureTerminalVisible(oakPage)
      await waitForActiveTerminalManager(oakPage, 15_000)
      await waitForAllPanesToHaveContent(oakPage, `switchback-${i} after return`)

      await switchToWorktree(oakPage, homeWorktreeId)
      await expect
        .poll(async () => getActiveWorktreeId(oakPage), { timeout: 10_000 })
        .toBe(homeWorktreeId)
      await removeWorktreeViaStore(oakPage, newId)
      createdWorktreeIds.pop()
    }
  })

  test('@headful rapid switching between many setup-split worktrees', async ({ oakPage }) => {
    test.setTimeout(120_000)
    const homeWorktreeId = await waitForActiveWorktree(oakPage)
    await waitForActiveTerminalManager(oakPage, 30_000)

    const worktreeIds = [homeWorktreeId]
    for (let i = 0; i < 4; i++) {
      const newId = await createAndActivateWorktreeWithSetup(oakPage, `multi-${i}`, 'vertical')
      createdWorktreeIds.push(newId)
      worktreeIds.push(newId)

      await expect.poll(async () => getActiveWorktreeId(oakPage), { timeout: 10_000 }).toBe(newId)
      await ensureTerminalVisible(oakPage)
      await waitForActiveTerminalManager(oakPage, 30_000)
      await waitForPaneCount(oakPage, 2, 15_000)
      await waitForAllPanesToHaveContent(oakPage, `multi-create-${i}`)
    }

    for (let round = 0; round < 3; round++) {
      for (const wId of worktreeIds) {
        await switchToWorktree(oakPage, wId)
        await expect.poll(async () => getActiveWorktreeId(oakPage), { timeout: 10_000 }).toBe(wId)
        await ensureTerminalVisible(oakPage)
        await waitForActiveTerminalManager(oakPage, 15_000)
        await waitForAllPanesToHaveContent(oakPage, `multi-r${round}-${wId.slice(0, 8)}`)
      }
    }
  })
})
