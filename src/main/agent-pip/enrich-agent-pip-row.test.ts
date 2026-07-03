import { describe, expect, it } from 'vitest'
import type { AgentStatusIpcPayload } from '../../shared/agent-status-types'
import type { WorktreeMeta } from '../../shared/types'
import { enrichAgentPipRow } from './enrich-agent-pip-row'

function ipcPayload(overrides: Partial<AgentStatusIpcPayload> = {}): AgentStatusIpcPayload {
  return {
    state: 'working',
    prompt: 'please add another blue button to the settings page',
    paneKey: 'tab-1:6f9619ff-8b86-4d11-b42d-00c04fc964ff',
    connectionId: null,
    receivedAt: 1_000,
    stateStartedAt: 1_000,
    ...overrides
  }
}

function metaSource(meta: Record<string, Partial<WorktreeMeta>>): {
  getWorktreeMeta: (worktreeId: string) => WorktreeMeta | undefined
} {
  return {
    getWorktreeMeta: (worktreeId) => meta[worktreeId] as WorktreeMeta | undefined
  }
}

describe('enrichAgentPipRow', () => {
  it('stamps agent label, derived title, and worktree display name', () => {
    const row = enrichAgentPipRow(
      ipcPayload({ agentType: 'claude', worktreeId: 'wt-1' }),
      metaSource({ 'wt-1': { displayName: 'Kittiwake' } })
    )
    expect(row.agentLabel).toBe('Claude')
    expect(row.derivedTitle).toBe('Add another blue button to the settings')
    expect(row.worktreeName).toBe('Kittiwake')
  })

  it('falls back to the worktree path basename when no display name exists', () => {
    const row = enrichAgentPipRow(
      ipcPayload({ worktreeId: 'repo-1::/Users/dev/projects/my-app' }),
      metaSource({})
    )
    expect(row.worktreeName).toBe('my-app')
  })

  it('handles missing worktree, prompt, and agent type', () => {
    const row = enrichAgentPipRow(ipcPayload({ prompt: '' }), null)
    expect(row.worktreeName).toBeNull()
    expect(row.derivedTitle).toBeNull()
    expect(row.agentLabel).toBe('Agent')
  })

  it('passes custom agent type strings through as the label', () => {
    const row = enrichAgentPipRow(ipcPayload({ agentType: 'my-custom-agent' }), null)
    expect(row.agentLabel).toBe('my-custom-agent')
  })
})
