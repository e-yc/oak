import type { AgentPipRowPayload } from '../../shared/agent-pip-types'
import type { AgentStatusIpcPayload } from '../../shared/agent-status-types'
import { formatAgentTypeLabel } from '../../shared/agent-type-label'
import { deriveGeneratedTabTitle } from '../../shared/agent-tab-title'
import { getWorktreePathBasenameFromId } from '../../shared/worktree-id'
import type { WorktreeMeta } from '../../shared/types'

export type AgentPipWorktreeMetaSource = {
  getWorktreeMeta(worktreeId: string): WorktreeMeta | undefined
}

// Why: the PiP renderer is store-free, so display labels must be stamped in
// main. Labels are derived from the hook payload (agent type + prompt) rather
// than mirrored from renderer tab titles — a renderer mirror would add a
// staleness protocol for marginal fidelity ("Claude Code 1" vs "Claude").
export function enrichAgentPipRow(
  payload: AgentStatusIpcPayload,
  store: AgentPipWorktreeMetaSource | null
): AgentPipRowPayload {
  const worktreeId = payload.worktreeId
  const worktreeName = worktreeId
    ? (store?.getWorktreeMeta(worktreeId)?.displayName ??
      getWorktreePathBasenameFromId(worktreeId))
    : null
  return {
    ...payload,
    worktreeName,
    derivedTitle: payload.prompt ? deriveGeneratedTabTitle(payload.prompt) : null,
    agentLabel: formatAgentTypeLabel(payload.agentType)
  }
}
