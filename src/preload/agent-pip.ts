import { contextBridge, ipcRenderer } from 'electron'
import type {
  AgentPipInitState,
  AgentPipReplyRequest,
  AgentPipReplyResult,
  AgentPipRowPayload
} from '../shared/agent-pip-types'
import type { AgentPipApi } from './agent-pip-api-types'

// Why: the PiP window gets its own narrow preload instead of the main
// window.api surface — it must not be able to reach privileged channels
// (pty writes, filesystem, settings); replies flow through the main process
// relay which re-validates the sender.
const agentPipApi: AgentPipApi = {
  getSnapshot: (): Promise<AgentPipRowPayload[]> => ipcRenderer.invoke('agentPip:getSnapshot'),
  getInitState: (): Promise<AgentPipInitState | null> =>
    ipcRenderer.invoke('agentPip:getInitState'),
  onSet: (callback: (row: AgentPipRowPayload) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, row: AgentPipRowPayload): void =>
      callback(row)
    ipcRenderer.on('agentPip:set', listener)
    return () => ipcRenderer.removeListener('agentPip:set', listener)
  },
  onClear: (callback: (data: { paneKey: string }) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: { paneKey: string }): void =>
      callback(data)
    ipcRenderer.on('agentPip:clear', listener)
    return () => ipcRenderer.removeListener('agentPip:clear', listener)
  },
  reply: (request: AgentPipReplyRequest): Promise<AgentPipReplyResult> =>
    ipcRenderer.invoke('agentPip:reply', request),
  focusPane: (paneKey: string): Promise<void> => ipcRenderer.invoke('agentPip:focusPane', paneKey),
  resizeContent: (height: number): void => {
    ipcRenderer.send('agentPip:resize', height)
  },
  closeWindow: (): void => {
    ipcRenderer.send('agentPip:close')
  }
}

contextBridge.exposeInMainWorld('agentPip', agentPipApi)
