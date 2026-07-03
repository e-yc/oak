import { ipcMain, screen } from 'electron'
import type { BrowserWindow } from 'electron'
import type {
  AgentPipInitState,
  AgentPipReplyResult,
  AgentPipRowPayload
} from '../../shared/agent-pip-types'
import {
  AGENT_PIP_MAX_CONTENT_HEIGHT,
  AGENT_PIP_MIN_CONTENT_HEIGHT
} from '../../shared/agent-pip-types'

// Why: mirrors the trusted-webContents pattern used by pty/ui/browser IPC —
// the PiP channels are privileged (they can inject text into agent terminals
// via the reply relay), so every handler verifies the sender is the actual
// PiP window before acting.
let agentPipWindow: BrowserWindow | null = null

export function setAgentPipWindow(win: BrowserWindow | null): void {
  agentPipWindow = win
}

function isEventFromAgentPipWindow(event: { sender: Electron.WebContents }): boolean {
  return (
    agentPipWindow !== null &&
    !agentPipWindow.isDestroyed() &&
    event.sender === agentPipWindow.webContents
  )
}

const MAX_REPLY_TEXT_LENGTH = 20_000

function parseReplyRequest(value: unknown): { paneKey: string; text: string } | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }
  const request = value as Record<string, unknown>
  if (typeof request.paneKey !== 'string' || typeof request.text !== 'string') {
    return null
  }
  if (request.paneKey.length === 0 || request.paneKey.length > 256) {
    return null
  }
  if (request.text.length === 0 || request.text.length > MAX_REPLY_TEXT_LENGTH) {
    return null
  }
  return { paneKey: request.paneKey, text: request.text }
}

export type AgentPipHandlerDeps = {
  getSnapshot: () => AgentPipRowPayload[]
  getInitState: () => AgentPipInitState
  reply: (paneKey: string, text: string) => Promise<AgentPipReplyResult>
  focusPane: (paneKey: string) => void
  requestClose: () => void
  /** Toggle requested from the main window (status bar button). Returns the
   *  intended open state (close is async, so isOpen() would read stale). */
  toggleFromMainWindow: () => boolean
  isOpen: () => boolean
  isMainWindowSender: (event: { sender: Electron.WebContents }) => boolean
}

export function registerAgentPipHandlers(deps: AgentPipHandlerDeps): void {
  // Why: matches the defensive pattern in src/main/ipc/agent-hooks.ts so
  // re-registration on macOS window recreation never throws.
  ipcMain.removeHandler('agentPip:getSnapshot')
  ipcMain.removeHandler('agentPip:getInitState')
  ipcMain.removeHandler('agentPip:reply')
  ipcMain.removeHandler('agentPip:focusPane')
  ipcMain.removeHandler('agentPip:toggleWindow')
  ipcMain.removeHandler('agentPip:isOpen')
  ipcMain.removeAllListeners('agentPip:resize')
  ipcMain.removeAllListeners('agentPip:close')

  ipcMain.handle('agentPip:getSnapshot', (event): AgentPipRowPayload[] => {
    if (!isEventFromAgentPipWindow(event)) {
      return []
    }
    return deps.getSnapshot()
  })

  ipcMain.handle('agentPip:getInitState', (event): AgentPipInitState | null => {
    if (!isEventFromAgentPipWindow(event)) {
      return null
    }
    return deps.getInitState()
  })

  ipcMain.handle('agentPip:reply', async (event, rawRequest): Promise<AgentPipReplyResult> => {
    if (!isEventFromAgentPipWindow(event)) {
      return { status: 'unknown-pane' }
    }
    const request = parseReplyRequest(rawRequest)
    if (!request) {
      return { status: 'unknown-pane' }
    }
    return deps.reply(request.paneKey, request.text)
  })

  ipcMain.handle('agentPip:focusPane', (event, paneKey): void => {
    if (!isEventFromAgentPipWindow(event) || typeof paneKey !== 'string') {
      return
    }
    deps.focusPane(paneKey)
  })

  ipcMain.on('agentPip:resize', (event, rawHeight) => {
    if (!isEventFromAgentPipWindow(event) || typeof rawHeight !== 'number') {
      return
    }
    const win = agentPipWindow
    if (!win || win.isDestroyed()) {
      return
    }
    const height = Math.round(
      Math.min(AGENT_PIP_MAX_CONTENT_HEIGHT, Math.max(AGENT_PIP_MIN_CONTENT_HEIGHT, rawHeight))
    )
    // Why: height is content-driven, so pin the vertical resize axis to the
    // reported height — the user resizes width only, like a video PiP. The
    // constraints must move before setBounds or the new height is clamped
    // back to the old pin.
    const [minWidth] = win.getMinimumSize()
    const [maxWidth] = win.getMaximumSize()
    win.setMinimumSize(minWidth, height)
    win.setMaximumSize(maxWidth, height)
    const bounds = win.getBounds()
    if (bounds.height === height) {
      return
    }
    // Why: when the PiP is parked in the lower half of its display (the
    // default bottom-right position), grow/shrink from the bottom edge so
    // new rows push the window up instead of off-screen. Upper half anchors
    // the top edge, matching what a user who dragged it there expects.
    let y = bounds.y
    try {
      const workArea = screen.getDisplayMatching(bounds).workArea
      const centerY = bounds.y + bounds.height / 2
      if (centerY > workArea.y + workArea.height / 2) {
        y = bounds.y + bounds.height - height
      }
    } catch {
      // Keep the top edge anchored if display lookup fails.
    }
    win.setBounds({ x: bounds.x, y, width: bounds.width, height })
  })

  ipcMain.on('agentPip:close', (event) => {
    if (!isEventFromAgentPipWindow(event)) {
      return
    }
    deps.requestClose()
  })

  ipcMain.handle('agentPip:toggleWindow', (event): boolean => {
    if (!deps.isMainWindowSender(event)) {
      return deps.isOpen()
    }
    return deps.toggleFromMainWindow()
  })

  ipcMain.handle('agentPip:isOpen', (event): boolean => {
    if (!deps.isMainWindowSender(event)) {
      return false
    }
    return deps.isOpen()
  })
}
