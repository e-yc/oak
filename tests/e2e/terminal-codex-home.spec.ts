import { test, expect } from './helpers/oak-app'
import {
  execInTerminal,
  getTerminalContent,
  waitForActivePanePtyId,
  waitForActiveTerminalManager
} from './helpers/terminal'
import { ensureTerminalVisible, waitForActiveWorktree, waitForSessionReady } from './helpers/store'

type CodexHomeProbe = {
  codexHome: string | null
  oakCodexHome: string | null
}

function readCodexHomeProbe(pageContent: string, marker: string): CodexHomeProbe | null {
  const match = new RegExp(`${marker}:(\\{[^\\r\\n]+\\})`).exec(pageContent)
  if (!match) {
    return null
  }
  return JSON.parse(match[1] ?? 'null') as CodexHomeProbe | null
}

test.describe('Terminal Codex runtime home', () => {
  test.beforeEach(async ({ oakPage }) => {
    await waitForSessionReady(oakPage)
    await waitForActiveWorktree(oakPage)
    await ensureTerminalVisible(oakPage)
  })

  test('terminal process receives the Oak-managed Codex home', async ({ oakPage }) => {
    await waitForActiveTerminalManager(oakPage)
    const ptyId = await waitForActivePanePtyId(oakPage)
    const marker = `__OAK_CODEX_HOME_E2E_${Date.now()}__`
    const command = [
      'node -e',
      `"console.log('${marker}:' + JSON.stringify({codexHome: process.env.CODEX_HOME || null, oakCodexHome: process.env.OAK_CODEX_HOME || null}))"`
    ].join(' ')

    await execInTerminal(oakPage, ptyId, command)

    let probe: CodexHomeProbe | null = null
    await expect
      .poll(
        async () => {
          probe = readCodexHomeProbe(await getTerminalContent(oakPage), marker)
          return Boolean(
            probe?.codexHome &&
            probe.oakCodexHome &&
            probe.codexHome === probe.oakCodexHome &&
            /[\\/]codex-runtime-home[\\/]home$/.test(probe.codexHome)
          )
        },
        { timeout: 15_000, message: 'Terminal did not expose Oak-managed Codex home env' }
      )
      .toBe(true)

    expect(probe?.codexHome).toBe(probe?.oakCodexHome)
  })
})
