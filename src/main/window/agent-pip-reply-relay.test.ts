import { EventEmitter } from 'node:events'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const ipcEmitter = new EventEmitter()
const ipcMainMock = {
  on: vi.fn((channel: string, listener: (...args: unknown[]) => void) => {
    ipcEmitter.on(channel, listener)
  }),
  removeListener: vi.fn((channel: string, listener: (...args: unknown[]) => void) => {
    ipcEmitter.removeListener(channel, listener)
  })
}

vi.mock('electron', () => ({
  ipcMain: ipcMainMock
}))

const REQUEST = {
  paneKey: 'tab-1:6f9619ff-8b86-4d11-b42d-00c04fc964ff',
  worktreeId: 'wt-1',
  tabId: 'tab-1',
  leafId: '6f9619ff-8b86-4d11-b42d-00c04fc964ff',
  text: 'add another blue button'
}

describe('requestAgentPipReplyFromRenderer', () => {
  beforeEach(() => {
    ipcEmitter.removeAllListeners()
    ipcMainMock.on.mockClear()
    ipcMainMock.removeListener.mockClear()
  })

  it('resolves with the renderer-reported status for the matching request id', async () => {
    const { requestAgentPipReplyFromRenderer } = await import('./agent-pip-reply-relay')
    const mainWebContents = { send: vi.fn() }
    const mainWindow = { isDestroyed: () => false, webContents: mainWebContents }

    const pending = requestAgentPipReplyFromRenderer(mainWindow as never, REQUEST)
    const sentRequest = mainWebContents.send.mock.calls[0]?.[1] as { id: string }
    expect(mainWebContents.send).toHaveBeenCalledWith(
      'agentPip:replyRequest',
      expect.objectContaining({ id: sentRequest.id, ...REQUEST })
    )

    ipcEmitter.emit(
      'agentPip:replyResponse',
      { sender: mainWebContents },
      { id: sentRequest.id, status: 'sent' }
    )

    await expect(pending).resolves.toEqual({ status: 'sent' })
  })

  it('ignores responses from other renderers and mismatched ids', async () => {
    const { requestAgentPipReplyFromRenderer } = await import('./agent-pip-reply-relay')
    const mainWebContents = { send: vi.fn() }
    const otherWebContents = {}
    const mainWindow = { isDestroyed: () => false, webContents: mainWebContents }

    const pending = requestAgentPipReplyFromRenderer(mainWindow as never, REQUEST)
    const sentRequest = mainWebContents.send.mock.calls[0]?.[1] as { id: string }

    ipcEmitter.emit(
      'agentPip:replyResponse',
      { sender: otherWebContents },
      { id: sentRequest.id, status: 'not-writable' }
    )
    ipcEmitter.emit(
      'agentPip:replyResponse',
      { sender: mainWebContents },
      { id: 'someone-else', status: 'not-writable' }
    )
    ipcEmitter.emit(
      'agentPip:replyResponse',
      { sender: mainWebContents },
      { id: sentRequest.id, status: 'sent' }
    )

    await expect(pending).resolves.toEqual({ status: 'sent' })
  })

  it('returns main-window-unavailable when the window is destroyed', async () => {
    const { requestAgentPipReplyFromRenderer } = await import('./agent-pip-reply-relay')
    const mainWindow = { isDestroyed: () => true, webContents: { send: vi.fn() } }

    await expect(requestAgentPipReplyFromRenderer(mainWindow as never, REQUEST)).resolves.toEqual({
      status: 'main-window-unavailable'
    })
  })

  it('resolves renderer-timeout when the renderer never responds', async () => {
    vi.useFakeTimers()
    try {
      const { requestAgentPipReplyFromRenderer } = await import('./agent-pip-reply-relay')
      const mainWebContents = { send: vi.fn() }
      const mainWindow = { isDestroyed: () => false, webContents: mainWebContents }

      const pending = requestAgentPipReplyFromRenderer(mainWindow as never, REQUEST)
      vi.advanceTimersByTime(30_000)
      await expect(pending).resolves.toEqual({ status: 'renderer-timeout' })
    } finally {
      vi.useRealTimers()
    }
  })
})
