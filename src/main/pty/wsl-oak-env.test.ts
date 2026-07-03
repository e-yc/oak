import { describe, expect, it } from 'vitest'
import { addOakWslInteropEnv } from './wsl-oak-env'

describe('addOakWslInteropEnv', () => {
  it('marks the Oak terminal handle for Windows to WSL env import', () => {
    const env: Record<string, string> = { OAK_TERMINAL_HANDLE: 'term_wsl' }

    addOakWslInteropEnv(env)

    expect(env.WSLENV).toBe('OAK_TERMINAL_HANDLE/u')
  })

  it('preserves existing WSLENV entries and does not duplicate the handle entry', () => {
    const env: Record<string, string> = {
      WSLENV: 'FOO/u:OAK_TERMINAL_HANDLE/u:BAR/p'
    }

    addOakWslInteropEnv(env)

    expect(env.WSLENV).toBe('FOO/u:OAK_TERMINAL_HANDLE/u:BAR/p')
  })

  it('marks OMP status and hook env for Windows to WSL import', () => {
    const env: Record<string, string> = {
      OAK_TERMINAL_HANDLE: 'term_wsl',
      OAK_OMP_STATUS_EXTENSION: 'C:\\Users\\jin\\.omp\\agent\\extensions\\oak-agent-status.ts',
      OAK_PANE_KEY: 'tab-1:leaf-1',
      OAK_TAB_ID: 'tab-1',
      OAK_WORKTREE_ID: 'repo::\\\\wsl.localhost\\Ubuntu\\home\\jin\\repo',
      OAK_AGENT_HOOK_PORT: '4567',
      OAK_AGENT_HOOK_TOKEN: 'token',
      OAK_AGENT_HOOK_ENV: 'dev',
      OAK_AGENT_HOOK_VERSION: '1'
    }

    addOakWslInteropEnv(env)

    expect(env.WSLENV).toContain('OAK_TERMINAL_HANDLE/u')
    expect(env.WSLENV).toContain('OAK_OMP_STATUS_EXTENSION/p')
    expect(env.WSLENV).toContain('OAK_PANE_KEY/u')
    expect(env.WSLENV).toContain('OAK_TAB_ID/u')
    expect(env.WSLENV).toContain('OAK_WORKTREE_ID/u')
    expect(env.WSLENV).toContain('OAK_AGENT_HOOK_PORT/u')
    expect(env.WSLENV).toContain('OAK_AGENT_HOOK_TOKEN/u')
    expect(env.WSLENV).toContain('OAK_AGENT_HOOK_ENV/u')
    expect(env.WSLENV).toContain('OAK_AGENT_HOOK_VERSION/u')
  })
})
