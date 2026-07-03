import { describe, expect, it } from 'vitest'
import type { AgentPipRowPayload } from '../../../shared/agent-pip-types'
import { AGENT_STATUS_STALE_AFTER_MS } from '../../../shared/agent-status-types'
import {
  AGENT_PIP_CLOSED_RETENTION_MS,
  AGENT_PIP_DONE_RETENTION_MS,
  applyAgentPipClear,
  applyAgentPipSet,
  pruneAgentPipRows,
  type AgentPipRow
} from './agent-pip-rows'

function payload(overrides: Partial<AgentPipRowPayload> = {}): AgentPipRowPayload {
  return {
    state: 'working',
    prompt: 'add a blue button',
    paneKey: 'tab-1:6f9619ff-8b86-4d11-b42d-00c04fc964ff',
    connectionId: null,
    receivedAt: 1_000,
    stateStartedAt: 1_000,
    worktreeName: 'kittiwake',
    derivedTitle: 'Add a blue button',
    agentLabel: 'Claude',
    ...overrides
  }
}

describe('applyAgentPipSet', () => {
  it('appends new panes and preserves first-seen ordering across state churn', () => {
    let rows: AgentPipRow[] = []
    rows = applyAgentPipSet(rows, payload({ paneKey: 'a:6f9619ff-8b86-4d11-b42d-00c04fc964ff' }), 1)
    rows = applyAgentPipSet(rows, payload({ paneKey: 'b:6f9619ff-8b86-4d11-b42d-00c04fc964ff' }), 2)
    rows = applyAgentPipSet(
      rows,
      payload({ paneKey: 'a:6f9619ff-8b86-4d11-b42d-00c04fc964ff', state: 'done' }),
      3
    )

    expect(rows.map((row) => row.payload.paneKey)).toEqual([
      'a:6f9619ff-8b86-4d11-b42d-00c04fc964ff',
      'b:6f9619ff-8b86-4d11-b42d-00c04fc964ff'
    ])
    expect(rows[0].payload.state).toBe('done')
    expect(rows[0].firstSeenAt).toBe(1)
  })

  it('revives a closed row when fresh status arrives for the same pane', () => {
    let rows: AgentPipRow[] = []
    rows = applyAgentPipSet(rows, payload({ state: 'done' }), 1)
    rows = applyAgentPipClear(rows, payload().paneKey, 2)
    expect(rows[0].closedAt).toBe(2)

    rows = applyAgentPipSet(rows, payload({ state: 'working' }), 3)
    expect(rows[0].closedAt).toBeNull()
    expect(rows[0].payload.state).toBe('working')
  })
})

describe('applyAgentPipClear', () => {
  it('keeps done rows as closed stubs and removes live rows', () => {
    let rows: AgentPipRow[] = []
    rows = applyAgentPipSet(
      rows,
      payload({ paneKey: 'a:6f9619ff-8b86-4d11-b42d-00c04fc964ff', state: 'done' }),
      1
    )
    rows = applyAgentPipSet(
      rows,
      payload({ paneKey: 'b:6f9619ff-8b86-4d11-b42d-00c04fc964ff', state: 'working' }),
      2
    )

    rows = applyAgentPipClear(rows, 'a:6f9619ff-8b86-4d11-b42d-00c04fc964ff', 5)
    rows = applyAgentPipClear(rows, 'b:6f9619ff-8b86-4d11-b42d-00c04fc964ff', 5)

    expect(rows).toHaveLength(1)
    expect(rows[0].payload.paneKey).toBe('a:6f9619ff-8b86-4d11-b42d-00c04fc964ff')
    expect(rows[0].closedAt).toBe(5)
  })

  it('returns the same array when the pane is unknown', () => {
    const rows = [
      { payload: payload(), firstSeenAt: 1, closedAt: null }
    ] satisfies AgentPipRow[]
    expect(applyAgentPipClear(rows, 'missing:6f9619ff-8b86-4d11-b42d-00c04fc964ff', 2)).toBe(rows)
  })
})

describe('pruneAgentPipRows', () => {
  it('expires closed stubs, lingering done rows, and stale live rows on their own clocks', () => {
    const rows: AgentPipRow[] = [
      // Closed stub within retention.
      {
        payload: payload({ paneKey: 'closed:6f9619ff-8b86-4d11-b42d-00c04fc964ff' }),
        firstSeenAt: 0,
        closedAt: 1_000
      },
      // Done row past done-retention.
      {
        payload: payload({
          paneKey: 'done:6f9619ff-8b86-4d11-b42d-00c04fc964ff',
          state: 'done',
          stateStartedAt: 0
        }),
        firstSeenAt: 0,
        closedAt: null
      },
      // Working row that went silent past the shared staleness bound.
      {
        payload: payload({
          paneKey: 'stale:6f9619ff-8b86-4d11-b42d-00c04fc964ff',
          receivedAt: 0
        }),
        firstSeenAt: 0,
        closedAt: null
      },
      // Fresh working row.
      {
        payload: payload({
          paneKey: 'live:6f9619ff-8b86-4d11-b42d-00c04fc964ff',
          receivedAt: AGENT_STATUS_STALE_AFTER_MS + 500
        }),
        firstSeenAt: 0,
        closedAt: null
      }
    ]

    const now = AGENT_STATUS_STALE_AFTER_MS + 1_000
    expect(now - 0).toBeGreaterThan(AGENT_PIP_DONE_RETENTION_MS)
    expect(now - 1_000).toBeGreaterThan(AGENT_PIP_CLOSED_RETENTION_MS)

    const pruned = pruneAgentPipRows(rows, now)
    expect(pruned.map((row) => row.payload.paneKey)).toEqual([
      'live:6f9619ff-8b86-4d11-b42d-00c04fc964ff'
    ])
  })

  it('returns the same array when nothing expires', () => {
    const rows: AgentPipRow[] = [{ payload: payload(), firstSeenAt: 0, closedAt: null }]
    expect(pruneAgentPipRows(rows, 2_000)).toBe(rows)
  })
})
