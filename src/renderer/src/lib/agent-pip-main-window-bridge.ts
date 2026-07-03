import type { AgentPipRendererReplyRequest } from '../../../shared/agent-pip-types'
import { parsePaneKey } from '../../../shared/stable-pane-id'
import { useAppStore } from '@/store'
import { activateAndRevealWorktree } from './worktree-activation'
import { activateTabAndFocusPane } from './activate-tab-and-focus-pane'

// Why: the PiP window cannot reach agent terminals itself — pty:write trusts
// only the main window, and SSH panes route through renderer-side runtime
// RPC. The main process relays PiP replies here, and this bridge executes
// them through the same pipeline the sidebar's "send to agent" flow uses.
async function handleAgentPipReplyRequest(request: AgentPipRendererReplyRequest): Promise<void> {
  try {
    // Why: dynamic import keeps the send pipeline out of the renderer's
    // startup chunk; replies only happen after a PiP interaction.
    const { sendNotesToActiveAgentSession } = await import('./active-agent-note-send')
    const result = await sendNotesToActiveAgentSession({
      worktreeId: request.worktreeId,
      prompt: request.text,
      noteTarget: { tabId: request.tabId, leafId: request.leafId }
    })
    window.api.agentPip.replyResponse({ id: request.id, status: result.status })
  } catch (err) {
    console.error('[agent-pip] reply send failed', err)
    window.api.agentPip.replyResponse({ id: request.id, status: 'not-writable' })
  }
}

function revealPaneFromAgentPip(paneKey: string): void {
  const parsed = parsePaneKey(paneKey)
  if (!parsed) {
    return
  }
  const state = useAppStore.getState()
  const worktreeId =
    state.agentStatusByPaneKey[paneKey]?.worktreeId ??
    state.retainedAgentsByPaneKey?.[paneKey]?.worktreeId
  if (!worktreeId) {
    return
  }
  // Why: route through activateAndRevealWorktree so cross-repo jumps set
  // activeRepoId, record nav history, and reveal the sidebar card — the
  // same rule inline agent rows follow.
  activateAndRevealWorktree(worktreeId)
  const tabs = useAppStore.getState().tabsByWorktree[worktreeId] ?? []
  if (tabs.some((tab) => tab.id === parsed.tabId)) {
    activateTabAndFocusPane(parsed.tabId, parsed.leafId, {
      flashFocusedPane: true,
      scrollToBottomIfOutputSinceLastView: true
    })
  }
}

export function installAgentPipMainWindowBridge(): () => void {
  const offReply = window.api.agentPip.onReplyRequest((request) => {
    void handleAgentPipReplyRequest(request)
  })
  const offReveal = window.api.agentPip.onRevealPane(({ paneKey }) => {
    revealPaneFromAgentPip(paneKey)
  })
  return () => {
    offReply()
    offReveal()
  }
}
