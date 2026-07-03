import { randomUUID } from 'node:crypto'

import { ipcMain } from 'electron'
import type { BrowserWindow } from 'electron'
import type {
  AgentPipRendererReplyRequest,
  AgentPipRendererReplyResponse,
  AgentPipReplyResult
} from '../../shared/agent-pip-types'

// Why: generous — a send can wait on an SSH runtime RPC probe plus the 500ms
// post-paste submit delay before the renderer can report an outcome.
const AGENT_PIP_REPLY_RENDERER_TIMEOUT_MS = 30_000

function isRendererReplyResponse(value: unknown): value is AgentPipRendererReplyResponse {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const response = value as Record<string, unknown>
  return typeof response.id === 'string' && typeof response.status === 'string'
}

/** Relays a PiP reply into the main-window renderer, which owns the runtime
 *  routing needed to reach both local and SSH agent terminals. Resolves with
 *  the renderer-reported send status, or 'renderer-timeout' when the renderer
 *  never responds (hung, reloading, torn down mid-flight). */
export async function requestAgentPipReplyFromRenderer(
  mainWindow: BrowserWindow,
  request: Omit<AgentPipRendererReplyRequest, 'id'>
): Promise<AgentPipReplyResult> {
  if (mainWindow.isDestroyed()) {
    return { status: 'main-window-unavailable' }
  }
  const id = randomUUID()
  return await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      ipcMain.removeListener('agentPip:replyResponse', onResponse)
      resolve({ status: 'renderer-timeout' })
    }, AGENT_PIP_REPLY_RENDERER_TIMEOUT_MS)
    const onResponse = (event: Electron.IpcMainEvent, response: unknown): void => {
      if (event.sender !== mainWindow.webContents) {
        return
      }
      if (!isRendererReplyResponse(response) || response.id !== id) {
        return
      }
      clearTimeout(timeout)
      ipcMain.removeListener('agentPip:replyResponse', onResponse)
      resolve({ status: response.status })
    }
    ipcMain.on('agentPip:replyResponse', onResponse)
    mainWindow.webContents.send('agentPip:replyRequest', { id, ...request })
  })
}
