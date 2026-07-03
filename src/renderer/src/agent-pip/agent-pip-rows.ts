import type { AgentPipRowPayload } from '../../../shared/agent-pip-types'
import { AGENT_STATUS_STALE_AFTER_MS } from '../../../shared/agent-status-types'

export type AgentPipRow = {
  payload: AgentPipRowPayload
  /** When this pane first appeared in the PiP. Rows keep insertion order —
   *  re-sorting on state changes would move the row the user is typing into. */
  firstSeenAt: number
  /** Set when the pane was cleared (terminal closed) while the row is kept
   *  visible as a disabled "session closed" row. */
  closedAt: number | null
}

/** How long finished (done) rows linger so the user can still reply. */
export const AGENT_PIP_DONE_RETENTION_MS = 15 * 60_000
/** How long a closed pane's row stays visible (input disabled). */
export const AGENT_PIP_CLOSED_RETENTION_MS = 5 * 60_000

export function applyAgentPipSet(
  rows: AgentPipRow[],
  payload: AgentPipRowPayload,
  now: number
): AgentPipRow[] {
  const index = rows.findIndex((row) => row.payload.paneKey === payload.paneKey)
  if (index === -1) {
    return [...rows, { payload, firstSeenAt: now, closedAt: null }]
  }
  const next = rows.slice()
  // Why: a fresh status for a previously-closed paneKey means the pane came
  // back (e.g. session resume) — revive the row instead of keeping it dead.
  next[index] = { ...next[index], payload, closedAt: null }
  return next
}

export function applyAgentPipClear(
  rows: AgentPipRow[],
  paneKey: string,
  now: number
): AgentPipRow[] {
  const index = rows.findIndex((row) => row.payload.paneKey === paneKey)
  if (index === -1) {
    return rows
  }
  const row = rows[index]
  // Why: finished rows survive the clear as a "session closed" stub so a user
  // glancing at the PiP still sees what completed; live rows just vanish —
  // their terminal is gone and there is nothing to reply to.
  if (row.payload.state === 'done' && row.closedAt === null) {
    const next = rows.slice()
    next[index] = { ...row, closedAt: now }
    return next
  }
  return rows.filter((_, i) => i !== index)
}

export function pruneAgentPipRows(rows: AgentPipRow[], now: number): AgentPipRow[] {
  const next = rows.filter((row) => {
    if (row.closedAt !== null) {
      return now - row.closedAt <= AGENT_PIP_CLOSED_RETENTION_MS
    }
    if (row.payload.state === 'done') {
      return now - row.payload.stateStartedAt <= AGENT_PIP_DONE_RETENTION_MS
    }
    return now - row.payload.receivedAt <= AGENT_STATUS_STALE_AFTER_MS
  })
  return next.length === rows.length ? rows : next
}
