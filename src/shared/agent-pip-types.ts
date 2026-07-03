import type { AgentStatusIpcPayload } from './agent-status-types'
import type { ActiveAgentNotesSendStatus } from './active-agent-send-status'
import type { GlobalSettings } from './types'
import type { UiLanguage } from './ui-language'

// ─── Agent PiP (pinned agent stack) IPC contract ─────────────────────────────
// The PiP window is a separate always-on-top BrowserWindow with a store-free
// renderer. The main process enriches hook-server status payloads with the
// display labels the PiP needs, because tab titles and worktree names live
// outside the PiP's reach (renderer store / persistence respectively).

export type AgentPipRowPayload = AgentStatusIpcPayload & {
  /** Worktree display name (or path basename fallback). Null when the status
   *  entry carries no worktree attribution. */
  worktreeName: string | null
  /** "Adding X"-style label derived from the agent's latest prompt. Null when
   *  the prompt is empty or yields no usable title. */
  derivedTitle: string | null
  /** Human agent name, e.g. "Claude", "Codex". */
  agentLabel: string
}

export type AgentPipReplyRequest = {
  paneKey: string
  text: string
}

export type AgentPipReplyStatus =
  | ActiveAgentNotesSendStatus
  | 'main-window-unavailable'
  | 'renderer-timeout'
  | 'unknown-pane'

export type AgentPipReplyResult = {
  status: AgentPipReplyStatus
}

/** Request relayed from main into the main-window renderer, which resolves the
 *  pane and executes the SSH-correct note-send pipeline. */
export type AgentPipRendererReplyRequest = {
  id: string
  paneKey: string
  worktreeId: string
  tabId: string
  leafId: string
  text: string
}

export type AgentPipRendererReplyResponse = {
  id: string
  status: ActiveAgentNotesSendStatus
}

export type AgentPipInitState = {
  uiLanguage: UiLanguage
  theme: GlobalSettings['theme']
  platform: NodeJS.Platform
}

/** Content height limits for the PiP window. The renderer reports its content
 *  height and main clamps before resizing the OS window; past the max the row
 *  list scrolls internally. */
export const AGENT_PIP_MIN_CONTENT_HEIGHT = 56
export const AGENT_PIP_MAX_CONTENT_HEIGHT = 480
