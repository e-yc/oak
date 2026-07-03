import React, { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import { AgentPipRow } from './AgentPipRow'
import {
  applyAgentPipClear,
  applyAgentPipSet,
  pruneAgentPipRows,
  type AgentPipRow as AgentPipRowData
} from './agent-pip-rows'

const PRUNE_INTERVAL_MS = 30_000

export function AgentPipApp(): React.JSX.Element {
  const [rows, setRows] = useState<AgentPipRowData[]>([])
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let disposed = false
    void window.agentPip.getSnapshot().then((snapshot) => {
      if (disposed) {
        return
      }
      setRows((prev) => {
        let next = prev
        for (const payload of snapshot) {
          next = applyAgentPipSet(next, payload, Date.now())
        }
        return next
      })
    })
    const offSet = window.agentPip.onSet((payload) => {
      setRows((prev) => applyAgentPipSet(prev, payload, Date.now()))
    })
    const offClear = window.agentPip.onClear(({ paneKey }) => {
      setRows((prev) => applyAgentPipClear(prev, paneKey, Date.now()))
    })
    return () => {
      disposed = true
      offSet()
      offClear()
    }
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setRows((prev) => pruneAgentPipRows(prev, Date.now()))
    }, PRUNE_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [])

  // Why: the OS window resizes to fit the row list (video-PiP behavior); the
  // main process clamps the reported height and anchors the correct edge.
  useEffect(() => {
    const el = contentRef.current
    if (!el) {
      return
    }
    const observer = new ResizeObserver(() => {
      window.agentPip.resizeContent(Math.ceil(el.getBoundingClientRect().height))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const workingCount = rows.filter(
    (row) => row.closedAt === null && row.payload.state === 'working'
  ).length

  return (
    <div className="agent-pip-drag agent-pip-surface flex h-dvh flex-col overflow-hidden text-popover-foreground">
      <div className="scrollbar-sleek flex-1 overflow-y-auto">
        <div ref={contentRef} className="flex flex-col gap-0.5 px-1.5 pb-1.5">
          <div className="flex h-6 items-center justify-between pl-1 pr-0">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">
              {translate('agentPip.header.title', 'Agents')}
              {workingCount > 0 ? (
                <span className="ml-1.5 font-medium normal-case tracking-normal text-muted-foreground/50">
                  {translate('agentPip.header.workingCount', '{{count}} working', {
                    count: workingCount
                  })}
                </span>
              ) : null}
            </span>
            <button
              type="button"
              className="agent-pip-no-drag agent-pip-row-hover flex size-4.5 items-center justify-center rounded-md text-muted-foreground/60 hover:text-foreground"
              aria-label={translate('agentPip.header.close', 'Close pinned agents')}
              onClick={() => window.agentPip.closeWindow()}
            >
              <X className="size-3" aria-hidden />
            </button>
          </div>
          {rows.length === 0 ? (
            <div className="flex h-8 items-center px-1 pb-1 text-[11px] text-muted-foreground/60">
              {translate('agentPip.empty', 'No active agents')}
            </div>
          ) : (
            rows.map((row) => (
              <AgentPipRow
                key={row.payload.paneKey}
                row={row}
                onFocusPane={(paneKey) => void window.agentPip.focusPane(paneKey)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
