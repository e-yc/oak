import type {
  AgentPipInitState,
  AgentPipReplyRequest,
  AgentPipReplyResult,
  AgentPipRowPayload
} from '../shared/agent-pip-types'

// Why: separate from the implementation (agent-pip.ts) so the PiP renderer can
// import the window.agentPip contract without touching contextBridge code —
// the same split api-types.ts provides for the main preload.
export type AgentPipApi = {
  getSnapshot: () => Promise<AgentPipRowPayload[]>
  getInitState: () => Promise<AgentPipInitState | null>
  onSet: (callback: (row: AgentPipRowPayload) => void) => () => void
  onClear: (callback: (data: { paneKey: string }) => void) => () => void
  reply: (request: AgentPipReplyRequest) => Promise<AgentPipReplyResult>
  focusPane: (paneKey: string) => Promise<void>
  resizeContent: (height: number) => void
  closeWindow: () => void
}

declare global {
  // oxlint-disable-next-line typescript-eslint/consistent-type-definitions -- declaration merging requires interface
  interface Window {
    agentPip: AgentPipApi
  }
}
